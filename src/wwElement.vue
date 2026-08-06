<template>
    <div class="ww-kanban" :class="{ 'ww-kanban--swimlanes': swimlanesEnabled }" :style="kanbanStyle">
        <template v-if="!swimlanesEnabled">
            <template v-if="content.uncategorizedStack && (!hideEmptyStacks || uncategorizedStack.count > 0)">
                <wwLayoutItemContext :index="0" :item="null" :data="uncategorizedStack" is-repeat>
                    <wwElement
                        v-bind="content.stackElement"
                        :ww-props="{
                            ...stackConfig,
                            items: uncategorizedStack.items,
                            stack: null,
                        }"
                        class="ww-kanban-stack"
                        :states="isDragging ? ['dragging'] : []"
                    ></wwElement>
                </wwLayoutItemContext>
            </template>

            <template v-for="(stack, index) in internalStacks" :key="'ww-stack-' + index">
                <wwLayoutItemContext :index="index" :item="null" is-repeat :data="stack" :repeated-items="internalStacks">
                    <wwElement
                        v-bind="content.stackElement"
                        :ww-props="{ ...stackConfig, items: stack.items, stack: stack.value }"
                        class="ww-kanban-stack"
                        :class="{ 'ww-kanban-stack--over-limit': stack.isOverLimit }"
                        :states="isDragging ? ['dragging'] : []"
                    ></wwElement>
                </wwLayoutItemContext>
            </template>
        </template>

        <template v-else>
            <div
                v-for="(lane, laneIndex) in visibleLanes"
                :key="'ww-lane-' + laneIndex"
                class="ww-kanban-lane"
                :class="{ 'ww-kanban-lane--over-limit': lane.isOverLimit }"
            >
                <wwLayoutItemContext :index="laneIndex" :item="null" is-repeat :data="lane" :repeated-items="visibleLanes">
                    <wwLayout path="laneHeaderElement" class="ww-kanban-lane-header"></wwLayout>
                </wwLayoutItemContext>

                <div class="ww-kanban-lane-body">
                    <template v-if="content.uncategorizedStack && (!hideEmptyStacks || lane.uncategorizedStack.count > 0)">
                        <wwLayoutItemContext :index="0" :item="null" :data="lane.uncategorizedStack" is-repeat>
                            <wwElement
                                v-bind="content.stackElement"
                                :ww-props="{
                                    ...stackConfig,
                                    items: lane.uncategorizedStack.items,
                                    stack: null,
                                    lane: lane.value,
                                }"
                                class="ww-kanban-stack"
                                :states="isDragging ? ['dragging'] : []"
                            ></wwElement>
                        </wwLayoutItemContext>
                    </template>

                    <template v-for="(stack, stackIndex) in lane.stacks" :key="'ww-stack-' + laneIndex + '-' + stackIndex">
                        <wwLayoutItemContext :index="stackIndex" :item="null" is-repeat :data="stack" :repeated-items="lane.stacks">
                            <wwElement
                                v-bind="content.stackElement"
                                :ww-props="{ ...stackConfig, items: stack.items, stack: stack.value, lane: lane.value }"
                                class="ww-kanban-stack"
                                :class="{ 'ww-kanban-stack--over-limit': stack.isOverLimit }"
                                :states="isDragging ? ['dragging'] : []"
                            ></wwElement>
                        </wwLayoutItemContext>
                    </template>
                </div>

                <wwLayoutItemContext :index="laneIndex" :item="null" is-repeat :data="lane" :repeated-items="visibleLanes">
                    <wwLayout path="laneFooterElement" class="ww-kanban-lane-footer"></wwLayout>
                </wwLayoutItemContext>
            </div>
        </template>
    </div>
</template>

<script>
import { provide, reactive, watch, computed } from "vue";

export default {
    props: {
        content: { type: Object, required: true },
        uid: { type: String, required: true },
        /* wwEditor:start */
        wwElementState: { type: Object, required: true },
        wwEditorState: { type: Object, required: true },
        /* wwEditor:end */
    },
    emits: ["trigger-event", "update:content:effect"],
    setup(props, { emit }) {
        // `stack`/`lane` here come straight from the ww-props each ww-stack cell was given
        // (ww-stack spreads its own props back into this call), so passing `lane` through the
        // template's ww-props is all that's needed to make drag events lane-aware.
        provide("customHandler", (change, { stack: stackValue, lane: laneValue, updatedStackItems }) => {
            if (change.moved) {
                emit("trigger-event", {
                    name: "item:moved",
                    event: {
                        item: change.moved.element,
                        from: stackValue,
                        to: stackValue,
                        fromStack: stackValue,
                        toStack: stackValue,
                        fromLane: laneValue ?? null,
                        toLane: laneValue ?? null,
                        oldIndex: change.moved.oldIndex,
                        newIndex: change.moved.newIndex,
                        updatedList: updatedStackItems,
                    },
                });
            }

            if (change.added) {
                // The item's own bound fields are the ground truth for where it came from -
                // it hasn't been written back to the DB yet, so `stackedBy`/`lanedBy` still
                // reflect its pre-drag position, same principle the stock component already
                // relied on for `from`.
                const fromStack = wwLib.resolveObjectPropertyPath(change.added.element, props.content.stackedBy);
                const fromLane = props.content.lanedBy
                    ? wwLib.resolveObjectPropertyPath(change.added.element, props.content.lanedBy) ?? null
                    : null;
                emit("trigger-event", {
                    name: "item:moved",
                    event: {
                        item: change.added.element,
                        from: fromStack,
                        to: stackValue,
                        fromStack,
                        toStack: stackValue,
                        fromLane,
                        toLane: laneValue ?? null,
                        oldIndex: null,
                        newIndex: change.added.newIndex,
                        updatedList: updatedStackItems,
                    },
                });
            }
        });

        const isDraggingManager = reactive({});
        provide("customDragHandler", (isDragging, { stack, lane }) => {
            // Keyed by lane+stack, not stack alone - the same stack value (e.g. "todo") exists
            // once per lane once swimlanes are on, so a stack-only key would let two lanes'
            // cells clobber each other's drag state.
            isDraggingManager[`${lane ?? ""}::${stack ?? ""}`] = isDragging;
        });

        const { setValue: setDrag } = wwLib.wwVariable.useComponentVariable({
            uid: props.uid,
            name: "isDragging",
            type: "boolean",
            defaultValue: false,
            readonly: true,
        });
        watch(
            isDraggingManager,
            (value) => {
                setDrag(Object.values(value).some((isDragging) => isDragging));
            },
            { deep: true }
        );

        const isDragging = computed(() => Object.values(isDraggingManager).some((isDragging) => isDragging));

        const css = computed(() => `* { cursor: ${props.content.draggingCursor || "grabbing"} !important; }`);
        const styletag = wwLib.getFrontDocument().createElement("style");

        watch(
            isDragging,
            (value) => {
                if (value) {
                    styletag.appendChild(wwLib.getFrontDocument().createTextNode(css.value));
                    wwLib.getFrontDocument().body.appendChild(styletag);
                } else {
                    styletag.remove();
                }
            },
            { deep: true }
        );

        return { isDragging };
    },
    computed: {
        stacks() {
            const stacks = wwLib.wwCollection.getCollectionData(this.content.stacks);
            if (!Array.isArray(stacks)) return [];
            return stacks;
        },
        items() {
            const items = wwLib.wwCollection.getCollectionData(this.content.items);
            if (!Array.isArray(items)) return [];
            return items;
        },
        stackDefs() {
            return this.stacks.map((stack) => ({
                label: wwLib.resolveObjectPropertyPath(stack, this.content.stackLabel || "label") ?? "",
                value: wwLib.resolveObjectPropertyPath(stack, this.content.stackValue || "value") ?? "",
            }));
        },
        swimlanesEnabled() {
            return !!this.content.swimlanesEnabled;
        },
        hideEmptyStacks() {
            return this.content.hideEmptyStacks !== false;
        },
        hideEmptyLanes() {
            return this.content.hideEmptyLanes !== false;
        },
        laneValues() {
            // Lanes are auto-discovered, not configured: every distinct, resolvable `lanedBy`
            // value seen across items becomes a lane, in first-seen order (laneSortedBy handles
            // the real ordering afterwards). Items with no resolvable value are deliberately left
            // out here - they fall into the separate uncategorized-lane bucket instead of forming
            // their own "null" lane, the same split already used for stacks.
            if (!this.swimlanesEnabled || !this.content.lanedBy) return [];
            const seen = new Set();
            const values = [];
            for (const item of this.items) {
                const value = wwLib.resolveObjectPropertyPath(item, this.content.lanedBy);
                if (value === undefined || value === null || seen.has(value)) continue;
                seen.add(value);
                values.push(value);
            }
            return values;
        },
        internalStacks() {
            return this.buildStacks(this.items);
        },
        uncategorizedStack() {
            return this.buildUncategorizedStack(this.items);
        },
        internalLanes() {
            if (!this.swimlanesEnabled) return [];
            const lanes = this.laneValues.map((laneValue) => this.buildLane(laneValue));
            lanes.sort(this.compareLanes);
            return this.hideEmptyLanes ? lanes.filter((lane) => lane.count > 0) : lanes;
        },
        uncategorizedLane() {
            return this.buildLane(null, true);
        },
        visibleLanes() {
            // Uncategorized lane is pinned first, same convention as the uncategorized stack
            // sitting outside (and before) the sorted stack list - it never participates in
            // laneSortedBy.
            if (!this.swimlanesEnabled) return [];
            const lanes = [];
            if (this.content.uncategorizedLane && (!this.hideEmptyLanes || this.uncategorizedLane.count > 0)) {
                lanes.push(this.uncategorizedLane);
            }
            return lanes.concat(this.internalLanes);
        },
        stackCounts() {
            if (!this.swimlanesEnabled) {
                return this.internalStacks.map((stack) => ({
                    stack: stack.value,
                    label: stack.label,
                    lane: null,
                    count: stack.count,
                    limit: stack.limit,
                    isOverLimit: stack.isOverLimit,
                }));
            }
            const cells = [];
            for (const lane of this.visibleLanes) {
                for (const stack of lane.stacks) {
                    cells.push({
                        stack: stack.value,
                        label: stack.label,
                        lane: lane.value,
                        count: stack.count,
                        limit: stack.limit,
                        isOverLimit: stack.isOverLimit,
                    });
                }
            }
            return cells;
        },
        laneCounts() {
            if (!this.swimlanesEnabled) return [];
            return this.visibleLanes.map((lane) => ({
                lane: lane.value,
                label: lane.label,
                count: lane.count,
                limit: lane.limit,
                isOverLimit: lane.isOverLimit,
            }));
        },
        stackConfig() {
            return {
                sortable: this.content.sortable,
                group: "kanban-" + this.uid,
                itemKey: this.content.itemKey,
                handle: this.content.customDragHandle ? this.content.handleClass || "draggable" : null,
                readonly: this.content.readonly,
            };
        },
        kanbanStyle() {
            return {
                "--wrap-stacks": this.content.wrapStacks ? "wrap" : "nowrap",
            };
        },
        isReadonly() {
            /* wwEditor:start */
            if (this.wwEditorState.isSelected) {
                return this.wwElementState.states.includes("readonly");
            }
            /* wwEditor:end */
            return this.content.readonly;
        },
    },
    watch: {
        isReadonly: {
            immediate: true,
            handler(value) {
                if (value) {
                    this.$emit("add-state", "readonly");
                } else {
                    this.$emit("remove-state", "readonly");
                }
            },
        },
        stackCounts: {
            deep: true,
            handler(value) {
                this._setStackCounts(value);
            },
        },
        laneCounts: {
            deep: true,
            handler(value) {
                this._setLaneCounts(value);
            },
        },
    },
    created() {
        // Not inside setup() because the counts they publish are derived from the Options-API
        // computed properties above (stackCounts/laneCounts) - useComponentVariable only needs
        // `uid`, not a Composition-API context, so calling it here is safe.
        const { setValue: setStackCounts } = wwLib.wwVariable.useComponentVariable({
            uid: this.uid,
            name: "stackCounts",
            type: "array",
            defaultValue: [],
            readonly: true,
        });
        const { setValue: setLaneCounts } = wwLib.wwVariable.useComponentVariable({
            uid: this.uid,
            name: "laneCounts",
            type: "array",
            defaultValue: [],
            readonly: true,
        });
        this._setStackCounts = setStackCounts;
        this._setLaneCounts = setLaneCounts;
        setStackCounts(this.stackCounts);
        setLaneCounts(this.laneCounts);
    },
    methods: {
        buildStacks(items) {
            const limit = this.content.stackWipLimit;
            const stacks = this.stackDefs.map((stack) => {
                const stackItems = items
                    .filter((item) => wwLib.resolveObjectPropertyPath(item, this.content.stackedBy) === stack.value)
                    .sort(this.compareItems);
                const count = stackItems.length;
                return {
                    ...stack,
                    items: stackItems,
                    count,
                    limit: limit > 0 ? limit : null,
                    isOverLimit: limit > 0 && count >= limit,
                };
            });
            return this.hideEmptyStacks ? stacks.filter((stack) => stack.count > 0) : stacks;
        },
        buildUncategorizedStack(items) {
            const stackValues = this.stackDefs.map((stack) => stack.value);
            const uncategorizedItems = items.filter(
                (item) => !stackValues.includes(wwLib.resolveObjectPropertyPath(item, this.content.stackedBy))
            );
            return {
                label: "Uncategorized",
                value: null,
                items: uncategorizedItems,
                count: uncategorizedItems.length,
                limit: null,
                isOverLimit: false,
            };
        },
        buildLane(laneValue, isUncategorized = false) {
            const laneItems = this.items.filter((item) => {
                const value = wwLib.resolveObjectPropertyPath(item, this.content.lanedBy);
                return isUncategorized ? value === undefined || value === null : value === laneValue;
            });
            const limit = this.content.laneWipLimit;
            const count = laneItems.length;
            return {
                label: isUncategorized ? "Uncategorized" : String(laneValue),
                value: isUncategorized ? null : laneValue,
                isUncategorized,
                count,
                limit: limit > 0 ? limit : null,
                isOverLimit: limit > 0 && count >= limit,
                items: laneItems,
                stacks: this.buildStacks(laneItems),
                uncategorizedStack: this.buildUncategorizedStack(laneItems),
            };
        },
        compareItems(a, b) {
            if (!this.content.sortedBy) return 0;
            const valueA = wwLib.resolveObjectPropertyPath(a, this.content.sortedBy);
            const valueB = wwLib.resolveObjectPropertyPath(b, this.content.sortedBy);
            if (this.content.sortOrder === "asc") {
                return valueA > valueB ? 1 : -1;
            } else {
                return valueA > valueB ? -1 : 1;
            }
        },
        compareLanes(a, b) {
            const mode = this.content.laneSortedBy || "label";
            const direction = this.content.laneSortOrder === "desc" ? -1 : 1;
            let valueA;
            let valueB;
            if (mode === "count") {
                valueA = a.count;
                valueB = b.count;
            } else if (mode === "field" && this.content.laneSortedByField) {
                // Lanes aren't bound rows themselves, so "sort by field" resolves the field
                // against each lane's first item - reusing the same resolveObjectPropertyPath
                // mechanism sortedBy already uses for items, rather than inventing a second one.
                valueA = a.items[0] ? wwLib.resolveObjectPropertyPath(a.items[0], this.content.laneSortedByField) : undefined;
                valueB = b.items[0] ? wwLib.resolveObjectPropertyPath(b.items[0], this.content.laneSortedByField) : undefined;
            } else {
                valueA = a.label;
                valueB = b.label;
            }
            if (valueA === valueB) return 0;
            return valueA > valueB ? direction : -direction;
        },
        /* wwEditor:start */
        getTestEvent() {
            if (!this.internalStacks.length) throw new Error("No stack found");
            if (!this.items.length) throw new Error("No item found");
            const lane = this.swimlanesEnabled && this.internalLanes.length ? this.internalLanes[0].value : null;
            return {
                item: this.items[0],
                from: this.internalStacks[0].value,
                to: this.internalStacks[0].value,
                fromStack: this.internalStacks[0].value,
                toStack: this.internalStacks[0].value,
                fromLane: lane,
                toLane: lane,
                oldIndex: 0,
                newIndex: 1,
                updatedList: this.items,
            };
        },
        /* wwEditor:end */
    },
};
</script>

<style lang="scss" scoped>
.ww-kanban {
    flex-direction: row;
    flex-wrap: var(--wrap-stacks);

    &.ww-kanban--swimlanes {
        flex-direction: column;
        flex-wrap: nowrap;
    }
}

.ww-kanban-lane {
    display: flex;
    flex-direction: column;
}

.ww-kanban-lane-body {
    display: flex;
    flex-direction: row;
    flex-wrap: var(--wrap-stacks);
}
</style>
