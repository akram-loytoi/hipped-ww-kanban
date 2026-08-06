<template>
    <div class="ww-kanban" :style="kanbanStyle">
        <template v-if="!swimlanesEnabled">
            <template v-if="showUncategorizedStackColumn">
                <wwLayoutItemContext :index="0" :item="null" :data="uncategorizedStack" is-repeat>
                    <wwElement
                        v-bind="content.stackElement"
                        :ww-props="{
                            ...stackConfig,
                            items: uncategorizedStack.items,
                            stack: null,
                            collapsed: isStackCollapsed(null),
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
                        :ww-props="{ ...stackConfig, items: stack.items, stack: stack.value, collapsed: isStackCollapsed(stack.value) }"
                        class="ww-kanban-stack"
                        :class="{ 'ww-kanban-stack--over-limit': stack.isOverLimit }"
                        :states="isDragging ? ['dragging'] : []"
                    ></wwElement>
                </wwLayoutItemContext>
            </template>
        </template>

        <!--
            A lane is a real child component now (content.laneElement, a hipped-ww-lane instance),
            sibling to stackElement rather than a set of dropzones bolted onto ww-kanban directly.
            It renders its own header dropzone and the stack cells for its row as genuine DOM
            children (ww-kanban hands it columns/stackElement/stackConfig via ww-props and stays
            "dumb" about how they're laid out internally) - this is what lets the lane's own
            background/border/padding actually contain the cards, rather than sitting behind them
            as an unrelated visual layer the way a dropzone-based background approximation did.

            Column alignment comes from two CSS custom properties set once on .ww-kanban-grid and
            read via inheritance everywhere else (the chrome rows here, and inside every
            hipped-ww-lane instance's own scoped styles) - inheritance works across component
            boundaries since custom properties follow the DOM tree, not Vue's component tree:
              --kanban-grid-template: the stack-column grid-template-columns value
              --kanban-lane-header-width: this board's lane-header slot width (shared by the
                chrome rows' leading spacer and every lane's own header slot, so they all agree)
            boardColumns is the one fixed, board-wide column list every row iterates, so a stack
            column always exists in the same position regardless of which lanes are empty for it.

            display:grid/flex live on this inner div rather than on .ww-kanban itself: the root's
            `display` is WeWeb-style-panel territory (see displayAllowedValues in ww-config.js,
            which only permits flex/inline-flex there) - overriding it from this component's own
            CSS would fight the style panel rather than cooperate with it.
        -->
        <div
            v-else
            class="ww-kanban-grid"
            :class="{ 'ww-kanban-grid--sticky-lane-header': content.stickyLaneHeader }"
            :style="{ '--kanban-grid-template': gridTemplate, '--kanban-lane-header-width': laneHeaderWidthValue + 'px' }"
        >
            <div
                class="ww-kanban-chrome-row"
                :class="{ 'ww-kanban-chrome-row--sticky-top': content.stickyStackHeader }"
            >
                <div class="ww-kanban-lane-edge"></div>

                <div class="ww-kanban-chrome-cells">
                    <wwLayoutItemContext
                        v-for="(column, columnIndex) in boardColumns"
                        :key="'ww-stack-chrome-header-' + columnIndex"
                        :index="columnIndex"
                        :item="null"
                        is-repeat
                        :data="column"
                        :repeated-items="boardColumns"
                    >
                        <wwElement
                            v-bind="content.stackElement"
                            :ww-props="{
                                ...stackConfig,
                                items: [],
                                stack: column.value,
                                collapsed: isStackCollapsed(column.value),
                                hideFooter: true,
                                group: chromeGroup,
                                sortable: false,
                            }"
                            class="ww-kanban-stack ww-kanban-stack--chrome"
                            :class="{ 'ww-kanban-stack--over-limit': column.isOverLimit }"
                        ></wwElement>
                    </wwLayoutItemContext>
                </div>
            </div>

            <wwLayoutItemContext
                v-for="(lane, laneIndex) in visibleLanes"
                :key="'ww-lane-' + laneIndex"
                :index="laneIndex"
                :item="null"
                is-repeat
                :data="lane"
                :repeated-items="visibleLanes"
            >
                <wwElement
                    v-bind="content.laneElement"
                    :ww-props="{
                        columns: lane.columns,
                        stackElement: content.stackElement,
                        stackConfig: stackConfig,
                        lane: lane.value,
                        isDragging: isDragging,
                        collapsedStacks: collapsedStacks,
                    }"
                    class="ww-kanban-lane"
                ></wwElement>
            </wwLayoutItemContext>

            <div
                class="ww-kanban-chrome-row"
                :class="{ 'ww-kanban-chrome-row--sticky-bottom': content.stickyStackFooter }"
            >
                <div class="ww-kanban-lane-edge"></div>

                <div class="ww-kanban-chrome-cells">
                    <wwLayoutItemContext
                        v-for="(column, columnIndex) in boardColumns"
                        :key="'ww-stack-chrome-footer-' + columnIndex"
                        :index="columnIndex"
                        :item="null"
                        is-repeat
                        :data="column"
                        :repeated-items="boardColumns"
                    >
                        <wwElement
                            v-bind="content.stackElement"
                            :ww-props="{
                                ...stackConfig,
                                items: [],
                                stack: column.value,
                                collapsed: isStackCollapsed(column.value),
                                hideHeader: true,
                                group: chromeGroup,
                                sortable: false,
                            }"
                            class="ww-kanban-stack ww-kanban-stack--chrome"
                            :class="{ 'ww-kanban-stack--over-limit': column.isOverLimit }"
                        ></wwElement>
                    </wwLayoutItemContext>
                </div>
            </div>
        </div>
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

        // Collapse is keyed by stack value alone, not stack+lane: a stack's header is now only
        // ever rendered once, in the dedicated chrome row (see boardColumns/template), so it's
        // the only click target available, and collapsing it collapses that column in every lane
        // at once rather than each lane's cell independently.
        const collapsedStacks = reactive({});
        provide("customCollapseHandler", ({ stack }) => {
            const key = stack ?? "";
            collapsedStacks[key] = !collapsedStacks[key];
        });

        // One shared toggle for the whole board, not per-lane: the lane-header column is a
        // single board-wide column (like a stack column), so there's only ever one collapsed
        // state for it, not one per lane.
        const { value: laneHeaderCollapsed, setValue: setLaneHeaderCollapsed } = wwLib.wwVariable.useComponentVariable({
            uid: props.uid,
            name: "laneHeaderCollapsed",
            type: "boolean",
            defaultValue: false,
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

        return { isDragging, collapsedStacks, laneHeaderCollapsed, setLaneHeaderCollapsed };
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
        chromeGroup() {
            // A drag group nothing else shares, so the header/footer chrome cells (which always
            // have zero items and belong to no lane) can never register as a real drop target -
            // dropping a card there would otherwise silently strip its lane assignment.
            return "ww-kanban-chrome-" + this.uid;
        },
        showUncategorizedStackColumn() {
            return !!this.content.uncategorizedStack && (!this.hideEmptyStacks || this.uncategorizedStack.count > 0);
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
            // Board-wide, hideEmptyStacks-filtered stack list. In swimlane mode this doubles as
            // the fixed column set (via boardColumns) - a column exists if it has items ANYWHERE
            // on the board, not just in the current lane, so every lane shows the same columns
            // in the same order and stays aligned under one shared header.
            return this.buildStackCells(this.items, this.hideEmptyStacks);
        },
        uncategorizedStack() {
            return this.buildUncategorizedStack(this.items);
        },
        boardColumns() {
            if (!this.swimlanesEnabled) return [];
            const columns = this.showUncategorizedStackColumn ? [this.uncategorizedStack] : [];
            return columns.concat(this.internalStacks);
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
        gridTemplate() {
            // Baked directly into the column-template string per column (same technique as
            // kanvana's swimlane board), rather than left to per-cell state styling: a collapsed
            // column needs the GRID TRACK itself to narrow, not just its visible content, or the
            // column would still reserve full width and leave a gap.
            //
            // Expanded columns use minmax(stackMinWidth, 1fr), not minmax(0, auto) - a 0 minimum
            // gives the grid permission to shrink tracks all the way down to fit the available
            // width instead of overflowing, which is what squeezed every column into a cramped
            // sliver with items bleeding across column boundaries. A real minimum means the board
            // overflows and scrolls horizontally once columns don't fit, matching how the
            // original flex-based layout behaved with wrapStacks off.
            const collapsedWidth = this.content.collapsedStackWidth > 0 ? this.content.collapsedStackWidth : 60;
            const minWidth = this.content.stackMinWidth > 0 ? this.content.stackMinWidth : 240;
            // Stack columns only - the lane-header slot is a separate CSS var
            // (--kanban-lane-header-width, see laneHeaderWidthValue) now that it's each
            // hipped-ww-lane instance's own flex-sized header slot rather than a leading grid
            // track shared across one combined template string.
            return this.boardColumns
                .map((column) =>
                    this.isStackCollapsed(column.value) ? `${collapsedWidth}px` : `minmax(${minWidth}px, 1fr)`
                )
                .join(" ");
        },
        laneHeaderWidthValue() {
            return this.laneHeaderCollapsed
                ? this.content.laneHeaderCollapsedWidth > 0
                    ? this.content.laneHeaderCollapsedWidth
                    : 48
                : this.content.laneHeaderWidth > 0
                ? this.content.laneHeaderWidth
                : 160;
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
        collapsedStacks: {
            deep: true,
            handler(value) {
                this._setCollapsedStacks(Object.keys(value).filter((key) => value[key]));
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
        const { setValue: setCollapsedStacks } = wwLib.wwVariable.useComponentVariable({
            uid: this.uid,
            name: "collapsedStacks",
            type: "array",
            defaultValue: [],
            readonly: true,
        });
        this._setStackCounts = setStackCounts;
        this._setLaneCounts = setLaneCounts;
        this._setCollapsedStacks = setCollapsedStacks;
        setStackCounts(this.stackCounts);
        setLaneCounts(this.laneCounts);
        setCollapsedStacks(Object.keys(this.collapsedStacks).filter((key) => this.collapsedStacks[key]));
    },
    methods: {
        buildStackCells(items, filterEmpty) {
            const limit = this.content.stackWipLimit;
            const cells = this.stackDefs.map((stack) => {
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
            return filterEmpty ? cells.filter((cell) => cell.count > 0) : cells;
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
            // Lanes have no bound "row" of their own (they're discovered from items, not
            // configured like stacks), so a human-friendly label - distinct from the raw
            // grouping value - can only come from a field on one of the lane's own items.
            const label = isUncategorized
                ? "Uncategorized"
                : this.content.lanedByLabel && laneItems[0]
                ? wwLib.resolveObjectPropertyPath(laneItems[0], this.content.lanedByLabel) ?? String(laneValue)
                : String(laneValue);
            // Unfiltered per-column cells for this lane, then narrowed down to exactly the
            // board-wide visible columns (this.internalStacks) - never independently, or this
            // lane's columns would drift out of alignment with every other lane's row again.
            const boardStackValues = this.internalStacks.map((stack) => stack.value);
            const stacks = this.buildStackCells(laneItems, false).filter((cell) => boardStackValues.includes(cell.value));
            const uncategorizedStack = this.buildUncategorizedStack(laneItems);
            const columns = this.showUncategorizedStackColumn ? [uncategorizedStack].concat(stacks) : stacks;
            return {
                label,
                value: isUncategorized ? null : laneValue,
                isUncategorized,
                count,
                limit: limit > 0 ? limit : null,
                isOverLimit: limit > 0 && count >= limit,
                items: laneItems,
                stacks,
                uncategorizedStack,
                columns,
            };
        },
        isStackCollapsed(stackValue) {
            return !!this.collapsedStacks[stackValue ?? ""];
        },
        toggleLaneHeaderCollapsed() {
            this.setLaneHeaderCollapsed(!this.laneHeaderCollapsed);
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
}

/*
 * .ww-kanban-grid itself is NOT a grid - it's a plain vertical stack (chrome header row, each
 * lane instance, chrome footer row) that exists only to hold --kanban-grid-template and
 * --kanban-lane-header-width as CSS custom properties. The chrome rows below and every
 * hipped-ww-lane instance's own scoped styles read those via inheritance, which keeps columns
 * aligned across separate components regardless of the Vue component boundary in between -
 * custom properties follow the DOM tree, not Vue's component tree.
 *
 * display:flex here (and display:grid on .ww-kanban-chrome-cells below) rather than on
 * .ww-kanban itself: the root's `display` is WeWeb-style-panel territory (see
 * displayAllowedValues in ww-config.js, which only allows flex/inline-flex there) - overriding
 * it from this component's own CSS would fight the style panel rather than cooperate with it.
 */
.ww-kanban-grid {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-width: 0;
    // All rows (chrome header, every lane, chrome footer) live inside this single scrolling
    // container, so scrolling right moves them together in lockstep - columns stay aligned
    // instead of each row scrolling independently.
    overflow-x: auto;
}

// Mirrors hipped-ww-lane's own .ww-lane/.ww-lane-header/.ww-lane-body structure exactly, so the
// chrome rows' leading spacer + inner grid line up with every lane's actual header + cells.
.ww-kanban-chrome-row {
    display: flex;
    flex-direction: row;
    align-items: stretch;
}

.ww-kanban-lane-edge {
    flex: 0 0 var(--kanban-lane-header-width, auto);
    min-width: 0;
}

.ww-kanban-chrome-cells {
    display: grid;
    grid-template-columns: var(--kanban-grid-template);
    align-items: start;
    flex: 1 1 auto;
    min-width: 0;
}

.ww-kanban-chrome-row--sticky-top {
    position: sticky;
    top: 0;
    z-index: 2;
}

.ww-kanban-chrome-row--sticky-bottom {
    position: sticky;
    bottom: 0;
    z-index: 2;
}

// Reaches into every hipped-ww-lane instance's own header slot - :deep() penetrates DOM
// descendants regardless of the component boundary, unlike stickyStackHeader/Footer above which
// just stick the whole chrome row (there's no per-instance header to individually target there,
// it's a single shared row).
.ww-kanban-grid--sticky-lane-header :deep(.ww-lane-header) {
    position: sticky;
    left: 0;
    z-index: 3;
}
</style>
