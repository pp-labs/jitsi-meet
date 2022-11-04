const BACKGROUND_COLOR = "rgba(51, 51, 51, .5)";

/**
 * Creates the styles for the component.
 *
 * @param {Object} theme - The current theme.
 * @returns {Object}
 */
export const styles = (theme) => {
    return {
        toggleFilmstripContainer: {
            display: "flex",
            flexWrap: "nowrap",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: BACKGROUND_COLOR,
            width: "32px",
            height: "24px",
            position: "absolute",
            borderRadius: "4px",
            top: "calc(-24px - 3px)",
            left: "calc(50% - 16px)",
            opacity: 0,
            transition: "opacity .3s",
            zIndex: 1,

            "&:hover": {
                backgroundColor: theme.palette.ui02,
            },
        },

        toggleFilmstripButton: {
            transform: "rotate(90deg)",
            marginTop: "calc(-24px - 1px - 4px)",
            fontSize: "14px",
            lineHeight: 1.2,
            textAlign: "center",
            background: "transparent",
            height: "auto",
            width: "100%",
            padding: 0,
            margin: 0,
            border: "none",

            "-webkit-appearance": "none",

            "& svg": {
                fill: theme.palette.icon01,
            },
        },

        toggleVerticalFilmstripContainer: {
            transform: "rotate(-90deg)",
            left: "-40px",
            top: "calc(50% - 12px)",
        },

        toggleTopPanelContainer: {
            transform: "rotate(180deg)",
            bottom: "calc(-24px - 6px)",
            top: "auto",
        },

        toggleTopPanelContainerHidden: {
            visibility: "hidden",
        },

        filmstrip: {
            transition:
                "background .2s ease-in-out, right 1s, bottom 1s, top 1s, height .3s ease-in",
            right: 0,
            bottom: 0,

            "&:hover": {
                "& .resizable-filmstrip": {
                    backgroundColor: BACKGROUND_COLOR,
                },

                "& .filmstrip-hover": {
                    backgroundColor: BACKGROUND_COLOR,
                },

                "& .toggleFilmstripContainer": {
                    opacity: 1,
                },

                "& .dragHandleContainer": {
                    visibility: "visible",
                },
            },

            ".horizontal-filmstrip &.hidden": {
                bottom: "-50px",

                "&:hover": {
                    backgroundColor: "transparent",
                },
            },

            "&.hidden": {
                "& .toggleFilmstripContainer": {
                    opacity: 1,
                },
            },
        },

        filmstripBackground: {
            backgroundColor: theme.palette.uiBackground,

            "&:hover": {
                backgroundColor: theme.palette.uiBackground,
            },
        },

        resizableFilmstripContainer: {
            display: "flex",
            position: "relative",
            flexDirection: "row",
            alignItems: "center",
            height: "100%",
            width: "100%",
            transition: "background .2s ease-in-out",

            "& .avatar-container": {
                maxWidth: "initial",
                maxHeight: "initial",
            },

            "&.top-panel-filmstrip": {
                flexDirection: "column",
            },
        },

        dragHandleContainer: {
            height: "100%",
            width: "9px",
            backgroundColor: "transparent",
            position: "relative",
            cursor: "col-resize",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            visibility: "hidden",

            "&:hover": {
                "& .dragHandle": {
                    backgroundColor: theme.palette.icon01,
                },
            },

            "&.visible": {
                visibility: "visible",

                "& .dragHandle": {
                    backgroundColor: theme.palette.icon01,
                },
            },

            "&.top-panel": {
                order: 2,
                width: "100%",
                height: "9px",
                cursor: "row-resize",

                "& .dragHandle": {
                    height: "3px",
                    width: "100px",
                },
            },
        },

        dragHandle: {
            backgroundColor: theme.palette.icon02,
            height: "100px",
            width: "3px",
            borderRadius: "1px",
        },
    };
};
