function showObjectPropertyPath(basePropertyKey, { content, boundProps }) {
    return (
        boundProps[basePropertyKey] &&
        content[basePropertyKey] &&
        typeof wwLib.wwCollection.getCollectionData(content[basePropertyKey])[0] === "object"
    );
}
function getObjectPropertyPathOptions(basePropertyKey, { content }) {
    const data = wwLib.wwCollection.getCollectionData(content[basePropertyKey]);
    if (!data.length || typeof data[0] !== "object") {
        return null;
    }

    return { object: data[0] };
}

export default {
    editor: {
        label: {
            en: "Kanban",
        },
        bubble: {
            icon: "template",
        },
        icon: "template",
        customSettingsPropertiesOrder: [
            "items",
            ["itemKey", "stackedBy", "sortedBy", "sortOrder"],
            ["swimlanesEnabled", "lanedBy", "lanedByLabel"],
            ["laneSortedBy", "laneSortedByField", "laneSortOrder"],
            ["laneHeaderWidth", "laneHeaderCollapsedWidth", "stickyLaneHeader"],
            ["stickyStackHeader", "stickyStackFooter"],
            ["stackMinWidth", "collapsedStackWidth"],
            "readonly",
            "draggingCursor",
            "customDragHandle",
            ["handleClass"],
        ],
    },
    states: ["readonly"],
    options: {
        displayAllowedValues: ["flex", "inline-flex"],
    },
    actions: [
        {
            label: { en: "Toggle lane header" },
            action: "toggleLaneHeaderCollapsed",
        },
    ],
    triggerEvents: [
        {
            name: "item:moved",
            label: { en: "On item moved" },
            event: {
                item: {},
                from: "",
                to: "",
                fromStack: "",
                toStack: "",
                fromLane: "",
                toLane: "",
                oldIndex: 0,
                newIndex: 1,
                updatedList: [],
            },
            getTestEvent: "getTestEvent",
            default: true,
        },
    ],
    properties: {
        stackElement: {
            hidden: true,
            //hipped-ww-stack
            defaultValue: {
                isWwObject: true,
                type: "e56264df-fcab-44c4-a422-adf173f0d745",
            },
        },
        laneElement: {
            hidden: true,
            // A real nested component reference, sibling to stackElement, not a dropzone -
            // hipped-ww-lane owns its own headerElement dropzone and internally renders the
            // stack cells it's handed via ww-props as genuine children, which is what lets its
            // own background/border/padding actually contain the cards.
            //hipped-ww-lane
            defaultValue: {
                isWwObject: true,
                type: "f5cb5cc2-0d77-42b4-8315-0a8510570ae3",
            },
        },
        laneColumnHeaderElement: {
            hidden: true,
            // Sits above the lane-header column, in the same chrome row as the stack headers
            // ("Todo", "In progress"...) - a label for what the lane grouping itself represents
            // (e.g. "Job opening"), shown once for the whole board like the stack headers are,
            // not per lane. No footer equivalent - lane footers were dropped as not useful.
            defaultValue: [{ isWwObject: true, type: "ww-flexbox" }],
            navigator: {
                group: "Lane column header",
            },
        },
        wrapStacks: {
            label: {
                en: "Wrap stacks",
            },
            type: "OnOff",
            defaultValue: true,
            responsive: true,
            bindable: true,
            states: true,
            classes: true,
        },
        items: {
            label: {
                en: "Items",
            },
            type: "Info",
            options: {
                text: { en: "Bind your data" },
            },
            bindable: true,
            defaultValue: [],
            section: "settings",
        },
        itemKey: {
            hidden: (content, sidepanelContent, boundProps) =>
                !showObjectPropertyPath("items", { content, boundProps }),
            label: {
                en: "Item key",
            },
            type: "ObjectPropertyPath",
            options: (content) => getObjectPropertyPathOptions("items", { content }),
            defaultValue: null,
            section: "settings",
        },
        stackedBy: {
            hidden: (content, sidepanelContent, boundProps) =>
                !showObjectPropertyPath("items", { content, boundProps }),
            label: {
                en: "Stacked by",
            },
            type: "ObjectPropertyPath",
            options: (content) => getObjectPropertyPathOptions("items", { content }),
            defaultValue: null,
            section: "settings",
        },
        sortedBy: {
            hidden: (content, sidepanelContent, boundProps) =>
                !showObjectPropertyPath("items", { content, boundProps }),
            label: {
                en: "Sorted by",
            },
            type: "ObjectPropertyPath",
            options: (content) => getObjectPropertyPathOptions("items", { content }),
            defaultValue: null,
            section: "settings",
        },
        sortOrder: {
            hidden: (content, sidepanelContent, boundProps) =>
                !showObjectPropertyPath("items", { content, boundProps }) || !content.sortedBy,
            label: {
                en: "Sort order",
            },
            type: "TextRadioGroup",
            options: {
                choices: [
                    {
                        label: { en: "Asc" },
                        value: "asc",
                        default: true,
                    },
                    {
                        label: { en: "Desc" },
                        value: "desc",
                    },
                ],
            },
            defaultValue: "asc",
            bindable: true,
            section: "settings",
        },
        sortable: {
            hidden: (content, sidepanelContent, boundProps) =>
                !showObjectPropertyPath("items", { content, boundProps }),
            label: {
                en: "Sortable",
            },
            type: "OnOff",
            defaultValue: true,
            section: "settings",
        },
        uncategorizedStack: {
            label: {
                en: "Uncategorized stack",
            },
            type: "OnOff",
            defaultValue: false,
            section: "settings",
        },
        swimlanesEnabled: {
            label: {
                en: "Swimlanes",
            },
            type: "OnOff",
            section: "settings",
            bindable: true,
            defaultValue: false,
            /* wwEditor:start */
            bindingValidation: {
                type: "boolean",
                tooltip: "A boolean that groups stacks into horizontal swimlanes: `true | false`",
            },
            /* wwEditor:end */
        },
        lanedBy: {
            hidden: (content, sidepanelContent, boundProps) =>
                !content.swimlanesEnabled || !showObjectPropertyPath("items", { content, boundProps }),
            label: {
                en: "Laned by",
            },
            type: "ObjectPropertyPath",
            options: (content) => getObjectPropertyPathOptions("items", { content }),
            defaultValue: null,
            section: "settings",
        },
        lanedByLabel: {
            hidden: (content, sidepanelContent, boundProps) =>
                !content.swimlanesEnabled || !showObjectPropertyPath("items", { content, boundProps }),
            label: {
                en: "Lane label",
            },
            type: "ObjectPropertyPath",
            options: (content) => getObjectPropertyPathOptions("items", { content }),
            defaultValue: null,
            section: "settings",
            propertyHelp: {
                tooltip:
                    "Optional. Field to display as the lane's label, if different from the field used to group by (Laned by). Resolved from the first item in each lane. Leave unset to just show the raw \"Laned by\" value.",
            },
        },
        laneHeaderWidth: {
            hidden: (content) => !content.swimlanesEnabled,
            label: {
                en: "Lane header width",
            },
            type: "Number",
            section: "settings",
            bindable: true,
            defaultValue: 160,
            options: {
                min: 0,
                unit: "px",
            },
            propertyHelp: {
                tooltip:
                    "Width, in pixels, of the lane-header column - a single board-wide column, same as a stack's own column, not sized to its content. Every row (the stack header row and every lane) needs to size this column identically, or content bleeds into the first stack column.",
            },
            /* wwEditor:start */
            bindingValidation: {
                type: "number",
                tooltip: "A number of pixels for the lane-header column width.",
            },
            /* wwEditor:end */
        },
        laneHeaderCollapsedWidth: {
            hidden: (content) => !content.swimlanesEnabled,
            label: {
                en: "Lane header collapsed width",
            },
            type: "Number",
            section: "settings",
            bindable: true,
            defaultValue: 48,
            options: {
                min: 0,
                unit: "px",
            },
            propertyHelp: {
                tooltip:
                    "Width, in pixels, the lane-header column shrinks to when collapsed via the \"Toggle lane header\" action.",
            },
            /* wwEditor:start */
            bindingValidation: {
                type: "number",
                tooltip: "A number of pixels for the collapsed lane-header column width.",
            },
            /* wwEditor:end */
        },
        stickyLaneHeader: {
            hidden: (content) => !content.swimlanesEnabled,
            label: {
                en: "Sticky lane header",
            },
            type: "OnOff",
            section: "settings",
            bindable: true,
            defaultValue: true,
            propertyHelp: {
                tooltip: "Pins the lane-header column to the left edge while scrolling horizontally through stack columns.",
            },
        },
        laneSortedBy: {
            hidden: (content) => !content.swimlanesEnabled,
            label: {
                en: "Lanes sorted by",
            },
            type: "TextSelect",
            options: {
                options: [
                    { value: "label", label: "Label (A-Z)", default: true },
                    { value: "count", label: "Item count" },
                    { value: "field", label: "Bound field" },
                ],
            },
            defaultValue: "label",
            bindable: true,
            section: "settings",
            /* wwEditor:start */
            bindingValidation: {
                type: "string",
                tooltip: "Valid values: label | count | field",
            },
            /* wwEditor:end */
        },
        laneSortedByField: {
            hidden: (content, sidepanelContent, boundProps) =>
                !content.swimlanesEnabled ||
                content.laneSortedBy !== "field" ||
                !showObjectPropertyPath("items", { content, boundProps }),
            label: {
                en: "Lane sort field",
            },
            type: "ObjectPropertyPath",
            options: (content) => getObjectPropertyPathOptions("items", { content }),
            defaultValue: null,
            section: "settings",
        },
        laneSortOrder: {
            hidden: (content) => !content.swimlanesEnabled,
            label: {
                en: "Lane sort order",
            },
            type: "TextRadioGroup",
            options: {
                choices: [
                    {
                        label: { en: "Asc" },
                        value: "asc",
                        default: true,
                    },
                    {
                        label: { en: "Desc" },
                        value: "desc",
                    },
                ],
            },
            defaultValue: "asc",
            bindable: true,
            section: "settings",
        },
        uncategorizedLane: {
            hidden: (content) => !content.swimlanesEnabled,
            label: {
                en: "Uncategorized lane",
            },
            type: "OnOff",
            defaultValue: false,
            section: "settings",
        },
        hideEmptyStacks: {
            label: {
                en: "Hide empty stacks",
            },
            type: "OnOff",
            defaultValue: true,
            bindable: true,
            section: "settings",
            propertyHelp: {
                tooltip:
                    "A stack is hidden only if it has no items anywhere on the board. With swimlanes on, this is board-wide, not per lane - every lane always shows the same set of columns, so they stay aligned under the same shared header.",
            },
        },
        hideEmptyLanes: {
            hidden: (content) => !content.swimlanesEnabled,
            label: {
                en: "Hide empty lanes",
            },
            type: "OnOff",
            defaultValue: true,
            bindable: true,
            section: "settings",
        },
        stackWipLimit: {
            label: {
                en: "Max items per stack",
            },
            type: "Number",
            section: "settings",
            bindable: true,
            defaultValue: null,
            options: {
                min: 0,
            },
            /* wwEditor:start */
            bindingValidation: {
                type: "number",
                tooltip: "A number setting the WIP limit per stack. Leave unset / 0 for no limit.",
            },
            /* wwEditor:end */
        },
        laneWipLimit: {
            hidden: (content) => !content.swimlanesEnabled,
            label: {
                en: "Max items per lane",
            },
            type: "Number",
            section: "settings",
            bindable: true,
            defaultValue: null,
            options: {
                min: 0,
            },
            /* wwEditor:start */
            bindingValidation: {
                type: "number",
                tooltip: "A number setting the WIP limit per lane. Leave unset / 0 for no limit.",
            },
            /* wwEditor:end */
        },
        stickyStackHeader: {
            label: {
                en: "Sticky stack header",
            },
            type: "OnOff",
            section: "settings",
            bindable: true,
            defaultValue: false,
            propertyHelp: {
                tooltip:
                    "Pins each stack's header to the top of its nearest scrolling container. With swimlanes on, the header is only shown once per stack (not repeated per lane), so this keeps it visible while scrolling through lanes.",
            },
        },
        stickyStackFooter: {
            label: {
                en: "Sticky stack footer",
            },
            type: "OnOff",
            section: "settings",
            bindable: true,
            defaultValue: false,
            propertyHelp: {
                tooltip: "Pins each stack's footer to the bottom of its nearest scrolling container.",
            },
        },
        stackMinWidth: {
            hidden: (content) => !content.swimlanesEnabled,
            label: {
                en: "Stack min width",
            },
            type: "Number",
            section: "settings",
            bindable: true,
            defaultValue: 240,
            options: {
                min: 0,
                unit: "px",
            },
            propertyHelp: {
                tooltip:
                    "Minimum width, in pixels, of an expanded stack's column. Only applies with swimlanes on - the board overflows and scrolls horizontally once columns can't fit at this width, rather than squeezing them narrower.",
            },
            /* wwEditor:start */
            bindingValidation: {
                type: "number",
                tooltip: "A number of pixels for the minimum expanded column width.",
            },
            /* wwEditor:end */
        },
        collapsedStackWidth: {
            hidden: (content) => !content.swimlanesEnabled,
            label: {
                en: "Collapsed stack width",
            },
            type: "Number",
            section: "settings",
            bindable: true,
            defaultValue: 60,
            options: {
                min: 0,
                unit: "px",
            },
            propertyHelp: {
                tooltip:
                    "Width, in pixels, a stack's column shrinks to when collapsed. Only applies with swimlanes on - the column's own grid track needs to narrow, not just its content, or the column keeps its full width with an empty gap.",
            },
            /* wwEditor:start */
            bindingValidation: {
                type: "number",
                tooltip: "A number of pixels for the collapsed column width.",
            },
            /* wwEditor:end */
        },
        stacks: {
            label: {
                en: "Stacks",
            },
            type: "Array",
            bindable: true,
            options: {
                movable: true,
                expandable: true,
                getItemLabel(_, index) {
                    return `Stack ${index + 1}`;
                },
                item: {
                    type: "Object",
                    defaultValue: { label: "", value: "" },
                    options: {
                        item: {
                            label: {
                                label: { en: "Label" },
                                type: "Text",
                            },
                            value: {
                                label: { en: "Value" },
                                type: "Text",
                            },
                        },
                    },
                },
            },
            defaultValue: [
                { label: "Todo", value: "todo" },
                { label: "In progress", value: "wip" },
                { label: "Done", value: "done" },
            ],
            section: "settings",
        },
        stackLabel: {
            hidden: (content, sidepanelContent, boundProps) =>
                !showObjectPropertyPath("stacks", { content, boundProps }),
            label: {
                en: "Label",
            },
            type: "ObjectPropertyPath",
            options: (content) => getObjectPropertyPathOptions("stacks", { content }),
            defaultValue: null,
            section: "settings",
        },
        stackValue: {
            hidden: (content, sidepanelContent, boundProps) =>
                !showObjectPropertyPath("stacks", { content, boundProps }),
            label: {
                en: "Value",
            },
            type: "ObjectPropertyPath",
            options: (content) => getObjectPropertyPathOptions("stacks", { content }),
            defaultValue: null,
            section: "settings",
        },
        readonly: {
            label: { en: "Read only", fr: "Lecture seule" },
            type: "OnOff",
            section: "settings",
            bindable: true,
            defaultValue: false,
            hidden: (content, sidePanelContent, boundProps, wwProps) => !!(wwProps && wwProps.readonly !== undefined),
            /* wwEditor:start */
            bindingValidation: {
                type: "boolean",
                tooltip: "A boolean that defines if the input is in readonly: `true | false`",
            },
            /* wwEditor:end */
        },
        draggingCursor: {
            label: { en: "Dragging cursor" },
            type: "TextSelect",
            section: "settings",
            options: {
                options: [
                    { value: "auto", label: "Auto" },
                    { value: "default", label: "Default" },
                    { value: "pointer", label: "Pointer" },
                    { value: "none", label: "None" },
                    { value: "not-allowed", label: "Not allowed" },
                    { value: "help", label: "Help" },
                    { value: "text", label: "Text" },
                    { value: "move", label: "Move" },
                    { value: "grab", label: "Grab" },
                    { value: "grabbing", label: "Grabbing", default: true },
                    { value: "n-resize", label: "Arrow up" },
                    { value: "s-resize", label: "Arrow down" },
                    { value: "w-resize", label: "Arrow left" },
                    { value: "e-resize", label: "Arrow right" },
                    { value: "ne-resize", label: "Arrow top-right" },
                    { value: "nw-resize", label: "Arrow top-left" },
                    { value: "se-resize", label: "Arrow bottom-right" },
                    { value: "sw-resize", label: "Arrow bottom-left" },
                    { value: "ew-resize", label: "Arrow left-right" },
                    { value: "ns-resize", label: "Arrow up-down" },
                    { value: "nesw-resize", label: "Arrow top-right to bottom-left" },
                    { value: "nwse-resize", label: "Arrow top-left to bottom-right" },
                    { value: "zoom-in", label: "Zoom in" },
                    { value: "zoom-out", label: "Zoom out" },
                    { value: "col-resize", label: "Column resize" },
                    { value: "row-resize", label: "Row resize" },
                    { value: "all-scroll", label: "All-scroll" },
                    { value: "context-menu", label: "Context menu" },
                    { value: "cell", label: "Cell" },
                    { value: "crosshair", label: "Crosshair" },
                    { value: "vertical-text", label: "Vertical text" },
                    { value: "alias", label: "Alias" },
                    { value: "copy", label: "Copy" },
                    { value: "progress", label: "Progress" },
                    { value: "wait", label: "Wait" },
                ],
            },
            bindable: true,
            /* wwEditor:start */
            bindingValidation: {
                type: "string",
                tooltip: "A string that represent the cursor type",
            },
            /* wwEditor:end */
            defaultValue: "grabbing",
        },
        customDragHandle: {
            label: "Custom drag",
            type: "OnOff",
            section: "settings",
            defaultValue: false,
            propertyHelp: {
                tooltip: `By default, dragging is triggered when a user clicks anywhere on a Kanban item. To trigger the dragging behavior on click of a specific element inside the item:
* Enable this option
* Go to that element’s Settings > HTML attributes
* Add the class you choose to its Class attribute (default: 'draggable'))`,
            },
            hidden: (content, sidePanelContent, boundProps, wwProps) => wwProps?.handle?.length,
        },
        handleClass: {
            label: "Class name",
            type: "Text",
            bindable: true,
            section: "settings",
            defaultValue: "draggable",
            propertyHelp: {
                tooltip:
                    "This class must be added on elements to trigger the drag&drop. (Settings > HTML attributes > Class)",
            },
            options: {
                placeholder: "draggable",
            },
            /* wwEditor:start */
            bindingValidation: {
                type: "string",
                tooltip: "A string that represent the class of the handle",
            },
            /* wwEditor:end */
            hidden: (content, sidePanelContent, boundProps, wwProps) =>
                !content.customDragHandle || wwProps?.handle?.length,
        },
    },
};
