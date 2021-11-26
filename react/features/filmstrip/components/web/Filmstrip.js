/* @flow */

import React, { PureComponent } from 'react';
import { FixedSizeList, FixedSizeGrid } from 'react-window';
import type { Dispatch } from 'redux';



// import { MEDIA_TYPE, VideoTrack } from "../../../base/media";
// import { getToolbarButtons } from "../../../base/config";
// import { translate } from "../../../base/i18n";
// import { Icon, IconMenuDown, IconMenuUp } from "../../../base/icons";
// import { getLocalParticipant } from "../../../base/participants";
// import { connect } from "../../../base/redux";
// import { isButtonEnabled } from "../../../toolbox/functions.web";
// import { LAYOUTS, getCurrentLayout } from "../../../video-layout";
// import { setFilmstripVisible } from "../../actions";
// import { shouldRemoteVideosBeVisible } from "../../functions";
// import {
//     getLocalAudioTrack,
//     getLocalVideoTrack,
//     getTrackByMediaTypeAndParticipant,
//     updateLastTrackVideoMediaEvent,
// } from "../../../base/tracks";
// import Thumbnail from "./Thumbnail";

import {
    createShortcutEvent,
    createToolbarEvent,
    sendAnalytics
} from '../../../analytics';
import { getToolbarButtons } from '../../../base/config';
import { isMobileBrowser } from '../../../base/environment/utils';
import { translate } from '../../../base/i18n';
import { Icon, IconMenuDown, IconMenuUp } from '../../../base/icons';
import { connect } from '../../../base/redux';
import { showToolbox } from '../../../toolbox/actions.web';
import { isButtonEnabled, isToolboxVisible } from '../../../toolbox/functions.web';
import { LAYOUTS, getCurrentLayout } from '../../../video-layout';
import { setFilmstripVisible, setVisibleRemoteParticipants } from '../../actions';
import {
    ASPECT_RATIO_BREAKPOINT,
    TILE_HORIZONTAL_MARGIN,
    TILE_VERTICAL_MARGIN,
    TOOLBAR_HEIGHT,
    TOOLBAR_HEIGHT_MOBILE
} from '../../constants';
import { shouldRemoteVideosBeVisible } from '../../functions';

import AudioTracksContainer from './AudioTracksContainer';
import Thumbnail from './Thumbnail';
import ThumbnailWrapper from './ThumbnailWrapper';


declare var APP: Object;
declare var interfaceConfig: Object;

/**
 * The type of the React {@code Component} props of {@link Filmstrip}.
 */
type Props = {
    /**
     * Additional CSS class names top add to the root.
     */
    _className: string,

    /**
     * The current layout of the filmstrip.
     */
    _currentLayout: string,

    /**
     * The number of columns in tile view.
     */
    _columns: number,

    /**
     * The width of the filmstrip.
     */
    _filmstripWidth: number,

    /**
     * The height of the filmstrip.
     */
    _filmstripHeight: number,

    /**
     * Whether this is a recorder or not.
     */
    _iAmRecorder: boolean,

    /**
     * Whether the filmstrip button is enabled.
     */
    _isFilmstripButtonEnabled: boolean,

    /**
     * The participants in the call.
     */
    _remoteParticipants: Array<Object>,

    /**
     * The length of the remote participants array.
     */
    _remoteParticipantsLength: number,

    /**
     * The number of rows in tile view.
     */
    _rows: number,

    /**
     * The height of the thumbnail.
     */
    _thumbnailHeight: number,

    /**
     * The width of the thumbnail.
     */
    _thumbnailWidth: number,

    /**
     * Flag that indicates whether the thumbnails will be reordered.
     */
    _thumbnailsReordered: Boolean,

    /**
     * Additional CSS class names to add to the container of all the thumbnails.
     */
    _videosClassName: string,

    /**
     * Whether or not the filmstrip videos should currently be displayed.
     */
    _visible: boolean,

    _clientHeight: number,

    _tracks: Array<Object>,
    _recentActiveParticipants: Array<Object>,

    /**
     * Whether or not the toolbox is displayed.
     */
    _isToolboxVisible: Boolean,

    /**
     * The redux {@code dispatch} function.
     */
    dispatch: Dispatch<any>,

    /**
     * Invoked to obtain translated strings.
     */
    t: Function,
};

/**
 * Implements a React {@link Component} which represents the filmstrip on
 * Web/React.
 *
 * @extends Component
 */

class Filmstrip extends PureComponent <Props> {

    /**
     * Initializes a new {@code Filmstrip} instance.
     *
     * @param {Object} props - The read-only properties with which the new
     * instance is to be initialized.
     */
    constructor(props: Props) {
        super(props);

        // Bind event handlers so they are only bound once for every instance.

        this._onShortcutToggleFilmstrip = this._onShortcutToggleFilmstrip.bind(this);
        this._onToolbarToggleFilmstrip = this._onToolbarToggleFilmstrip.bind(this);
        this._onTabIn = this._onTabIn.bind(this);
        this._gridItemKey = this._gridItemKey.bind(this);
        this._listItemKey = this._listItemKey.bind(this);
        this._onGridItemsRendered = this._onGridItemsRendered.bind(this);
        this._onListItemsRendered = this._onListItemsRendered.bind(this);
    }

    /**
     * Implements React's {@link Component#componentDidMount}.
     *
     * @inheritdoc
     */
    componentDidMount() {
        APP.keyboardshortcut.registerShortcut(
            "F",
            "filmstripPopover",
            this._onShortcutToggleFilmstrip,
            "keyboardShortcuts.toggleFilmstrip"
        );
    }

    /**
     * Implements React's {@link Component#componentDidUpdate}.
     *
     * @inheritdoc
     */
    componentWillUnmount() {
        APP.keyboardshortcut.unregisterShortcut("F");
    }

    /**
     * Implements React's {@link Component#render()}.
     *
     * @inheritdoc
     * @returns {ReactElement}
     */
    render() {


        // const filmstripRemoteVideosContainerStyle = {};
        // const {
        //     _currentLayout,
        //     _participants,
        //     _isDominantSpeakerDisabled,
        //     _clientHeight,
        //     _tracks,
        //     _recentActiveParticipants,
        // } = this.props;
        // let remoteParticipants = _participants.filter((p) => !p.local);
        // const localParticipant = getLocalParticipant(_participants);

        // const tileViewActive = _currentLayout === LAYOUTS.TILE_VIEW;
        // let maxVisableRemoteParticipants = 5;

        // // sally - no trainer in left side
        // if (!tileViewActive) {
        //     remoteParticipants = _participants.filter(
        //         (p) => !p.name?.startsWith("Trainer") && !p.local
        //     );
        //     // sally - height minus toolbar (80) minus local video (120), divide by thumb height
        //     maxVisableRemoteParticipants = Math.floor(((_clientHeight - 200) / 120))
        // } else {
        //     maxVisableRemoteParticipants = 5;
        // }

        // // sally order participants
        // remoteParticipants = remoteParticipants.map((p) => {
        //     if (p.name.startsWith("Trainer")) {
        //         p.order = 1;
        //         return p;
        //     }
        //     const isLocal = p?.local ?? true;
        //     if (isLocal) {
        //         p.order = 200;
        //         return p;
        //     }
        //     const recentParticipantIndex = _recentActiveParticipants.findIndex(
        //         (part) => part.id === p.id
        //     );
        //     if (p?.connectionStatus !== "active") {
        //         p.order = 100 + recentParticipantIndex;
        //         return p;
        //     }
        //     const isRemoteParticipant = !p?.isFakeParticipant && !p?.local;
        //     const participantID = p.id;
        //     const _videoTrack = getTrackByMediaTypeAndParticipant(
        //         _tracks,
        //         MEDIA_TYPE.VIDEO,
        //         participantID
        //     );
        //     const videoStreamMuted = _videoTrack
        //         ? _videoTrack.muted
        //         : "no stream";
        //     const isScreenSharing = _videoTrack?.videoType === "desktop";
        //     if (isRemoteParticipant && isScreenSharing) {
        //         p.order = 2;
        //         return p;
        //     }

        //     // sally - recent participants

        //     if (recentParticipantIndex > -1) {
        //         p.order = 10 + recentParticipantIndex;
        //         return p;
        //     }

        //     if (isRemoteParticipant && !videoStreamMuted) {
        //         p.order = 20;
        //         return p;
        //     }
        //     // const _audioTrack = isLocal
        //     //     ? getLocalAudioTrack(_tracks) : getTrackByMediaTypeAndParticipant(_tracks, MEDIA_TYPE.AUDIO, participantID);

        //     // sally - don't prioritize audio only to prevent jumping
        //     // if (isRemoteParticipant && _audioTrack && !_audioTrack.muted) {
        //     //     p.order = 5;
        //     //     return p;
        //     // }

        //     p.order = 30;
        //     return p;
        //     // const isRemoteParticipant: !participant?.isFakeParticipant && !participant?.local;
        //     // const { id } = participant;
        //     // const isLocal = participant?.local ?? true;
        //     // const tracks = state['features/base/tracks'];
        //     // const _videoTrack = isLocal
        //     //     ? getLocalVideoTrack(tracks) : getTrackByMediaTypeAndParticipant(tracks, MEDIA_TYPE.VIDEO, participantID);
        //     // const _audioTrack = isLocal
        //     //     ? getLocalAudioTrack(tracks) : getTrackByMediaTypeAndParticipant(tracks, MEDIA_TYPE.AUDIO, participantID);
        //     // if (isRemoteParticipant && (dmInput.isVideoPlayable && !dmInput.videoStreamMuted)
        // });
        // remoteParticipants.sort((a, b) => {
        //     if (a.order === b.order) {
        //         return 0;
        //     }
        //     return a.order > b.order ? 1 : -1;
        // });

        // // sally - order dominant speaker only if they are outside the box
        // try {
        //     if (
        //         !_isDominantSpeakerDisabled &&
        //         remoteParticipants.length > maxVisableRemoteParticipants
        //     ) {
        //         let i = remoteParticipants.findIndex((p) => p?.dominantSpeaker);

        //         if (i !== -1 && i >= maxVisableRemoteParticipants) {
        //             remoteParticipants[i].order = 3;
        //         }
        //         remoteParticipants.sort((a, b) => {
        //             if (a.order === b.order) {
        //                 return 0;
        //             }
        //             return a.order > b.order ? 1 : -1;
        //         });
        //     }
        // } catch (e) {
        //     console.log(e);
        // }
        // // if (!_isDominantSpeakerDisabled && p?.dominantSpeaker) {
        // //         p.order = 3
        // //         return p;
        // //     }

        // // Sally -  Add additional classes for trainer
        // // if (_participant.name.startsWith('Trainer')) {
        // //     className += ` trainer-participant`
        // // } else {
        // //     // add additional class for remote participants not sharing video
        // //     // isCurrentlyOnLargeVideo: _isCurrentlyOnLargeVideo,
        // //     // isHovered,
        // //     // isAudioOnly: _isAudioOnly,
        // //     // tileViewActive,
        // //     // isVideoPlayable: _isVideoPlayable,
        // //     // connectionStatus: _participant?.connectionStatus,
        // //     // canPlayEventReceived,
        // //     // videoStream: Boolean(_videoTrack),
        // //     // isRemoteParticipant: !_participant?.isFakeParticipant && !_participant?.local,
        // //     // isScreenSharing: _isScreenSharing,
        // //     // videoStreamMuted: _videoTrack ? _videoTrack.muted : 'no stream'
        // //     const dmInput = Thumbnail.getDisplayModeInput(this.props, this.state)
        // //     if (isRemoteParticipant && (dmInput.isVideoPlayable && !dmInput.videoStreamMuted)) {
        // //         className += ' has-video'
        // //     } else if (isRemoteParticipant && _audioTrack && !_audioTrack.muted) {
        // //         className += ' audio-only'
        // //     }
        // //     if ( isRemoteParticipant && dmInput.isScreenSharing) {
        // //         className += ' sharing-screen'
        // //     }
        // //     if (_participant?.local) {
        // //         className += ' local-participant'
        // //     }

        // const trainers = _participants.filter(
        //     (p) => p.name?.startsWith("Trainer")
        // );


        // // const trainer = _participants.find(p => p.name.startsWith('Trainer'));
        // switch (_currentLayout) {
        //     case LAYOUTS.VERTICAL_FILMSTRIP_VIEW:
        //         // Adding 18px for the 2px margins, 2px borders on the left and right and 5px padding on the left and right.
        //         // Also adding 7px for the scrollbar.
        //         filmstripStyle.maxWidth =
        //             (interfaceConfig.FILM_STRIP_MAX_HEIGHT || 120) + 25;
        //         break;
        //     case LAYOUTS.TILE_VIEW: {
        //         // The size of the side margins for each tile as set in CSS.
        //         const { _columns, _rows, _filmstripWidth } = this.props;

        //         if (_rows > _columns) {
        //             remoteVideoContainerClassName += " has-overflow";
        //         }

        //         filmstripRemoteVideosContainerStyle.width = _filmstripWidth;
        //         break;
        //     }
        // }

        // let remoteVideosWrapperClassName = "filmstrip__videos ";

        // if (this.props._hideScrollbar) {
        //     remoteVideosWrapperClassName += " hide-scrollbar";

        // switch (_currentLayout) {
        // case LAYOUTS.VERTICAL_FILMSTRIP_VIEW:
        //     // Adding 18px for the 2px margins, 2px borders on the left and right and 5px padding on the left and right.
        //     // Also adding 7px for the scrollbar.
        //     filmstripStyle.maxWidth = (interfaceConfig.FILM_STRIP_MAX_HEIGHT || 120) + 25;
        //     break;

       // }

        const filmstripStyle = { };
        const { _currentLayout } = this.props;
        const tileViewActive = _currentLayout === LAYOUTS.TILE_VIEW;

        switch (_currentLayout) {
        case LAYOUTS.VERTICAL_FILMSTRIP_VIEW:
            // Adding 18px for the 2px margins, 2px borders on the left and right and 5px padding on the left and right.
            // Also adding 7px for the scrollbar.
            filmstripStyle.maxWidth = (interfaceConfig.FILM_STRIP_MAX_HEIGHT || 120) + 25;
            break;
        }

        let toolbar = null;

        if (this.props._isFilmstripButtonEnabled) {
            toolbar = this._renderToggleButton();
        }
        return (
            <div
                className = { `filmstrip ${this.props._className}` }
                style = { filmstripStyle }>
                {/*sally - move tooldbar button*/}
                {/*{ toolbar }*/}
                <div
                    className = { this.props._videosClassName }
                    id = 'remoteVideos'>
                    <div
                        className = 'filmstrip__videos'
                        id = 'filmstripLocalVideo'>
                        <div id = 'filmstripLocalVideoThumbnail'>
                            {
                                !tileViewActive && <Thumbnail
                                    key = 'local' />
                            }
                        </div>
                    </div>
                    {
                        this._renderRemoteParticipants()
                    }
                    {/*{ moved toolbar button }*/}
                    {toolbar}
                </div>
                <AudioTracksContainer />
            </div>
        );
    }

    /**
     * Calculates the start and stop indices based on whether the thumbnails need to be reordered in the filmstrip.
     *
     * @param {number} startIndex - The start index.
     * @param {number} stopIndex - The stop index.
     * @returns {Object}
     */
    _calculateIndices(startIndex, stopIndex) {
        const { _currentLayout, _iAmRecorder, _thumbnailsReordered } = this.props;
        let start = startIndex;
        let stop = stopIndex;

        if (_thumbnailsReordered) {
            // In tile view, the indices needs to be offset by 1 because the first thumbnail is that of the local
            // endpoint. The remote participants start from index 1.
            if (!_iAmRecorder && _currentLayout === LAYOUTS.TILE_VIEW) {
                start = Math.max(startIndex - 1, 0);
                stop = stopIndex - 1;
            }
        }

        return {
            startIndex: start,
            stopIndex: stop
        };
    }

    _onTabIn: () => void;

    /**
     * Toggle the toolbar visibility when tabbing into it.
     *
     * @returns {void}
     */
    _onTabIn() {
        if (!this.props._isToolboxVisible && this.props._visible) {
            this.props.dispatch(showToolbox());
        }
    }

    _listItemKey: number => string;

    /**
     * The key to be used for every ThumbnailWrapper element in stage view.
     *
     * @param {number} index - The index of the ThumbnailWrapper instance.
     * @returns {string} - The key.
     */
    _listItemKey(index) {
        const { _remoteParticipants, _remoteParticipantsLength } = this.props;

        if (typeof index !== 'number' || _remoteParticipantsLength <= index) {
            return `empty-${index}`;
        }

        return _remoteParticipants[index];
    }

    _gridItemKey: Object => string;

    /**
     * The key to be used for every ThumbnailWrapper element in tile views.
     *
     * @param {Object} data - An object with the indexes identifying the ThumbnailWrapper instance.
     * @returns {string} - The key.
     */
    _gridItemKey({ columnIndex, rowIndex }) {
        const {
            _columns,
            _iAmRecorder,
            _remoteParticipants,
            _remoteParticipantsLength,
            _thumbnailsReordered
        } = this.props;
        const index = (rowIndex * _columns) + columnIndex;

        // When the thumbnails are reordered, local participant is inserted at index 0.
        const localIndex = _thumbnailsReordered ? 0 : _remoteParticipantsLength;
        const remoteIndex = _thumbnailsReordered && !_iAmRecorder ? index - 1 : index;

        if (index > _remoteParticipantsLength - (_iAmRecorder ? 1 : 0)) {
            return `empty-${index}`;
        }

        if (!_iAmRecorder && index === localIndex) {
            return 'local';
        }

        return _remoteParticipants[remoteIndex];
    }

    _onListItemsRendered: Object => void;

    /**
     * Handles items rendered changes in stage view.
     *
     * @param {Object} data - Information about the rendered items.
     * @returns {void}
     */
    _onListItemsRendered({ visibleStartIndex, visibleStopIndex }) {
        const { dispatch } = this.props;
        const { startIndex, stopIndex } = this._calculateIndices(visibleStartIndex, visibleStopIndex);

        dispatch(setVisibleRemoteParticipants(startIndex, stopIndex));
    }

    _onGridItemsRendered: Object => void;

    /**
     * Handles items rendered changes in tile view.
     *
     * @param {Object} data - Information about the rendered items.
     * @returns {void}
     */
    _onGridItemsRendered({
        visibleColumnStartIndex,
        visibleColumnStopIndex,
        visibleRowStartIndex,
        visibleRowStopIndex
    }) {
        const { _columns, dispatch } = this.props;
        const start = (visibleRowStartIndex * _columns) + visibleColumnStartIndex;
        const stop = (visibleRowStopIndex * _columns) + visibleColumnStopIndex;
        const { startIndex, stopIndex } = this._calculateIndices(start, stop);

        dispatch(setVisibleRemoteParticipants(startIndex, stopIndex));
    }

    /**
     * Renders the thumbnails for remote participants.
     *
     * @returns {ReactElement}
     */
    _renderRemoteParticipants() {
        const {
            _columns,
            _currentLayout,
            _filmstripHeight,
            _filmstripWidth,
            _remoteParticipantsLength,
            _rows,
            _thumbnailHeight,
            _thumbnailWidth
        } = this.props;

        if (!_thumbnailWidth || isNaN(_thumbnailWidth) || !_thumbnailHeight
            || isNaN(_thumbnailHeight) || !_filmstripHeight || isNaN(_filmstripHeight) || !_filmstripWidth
            || isNaN(_filmstripWidth)) {
            return null;
        }

        if (_currentLayout === LAYOUTS.TILE_VIEW) {
            return (
                <FixedSizeGrid
                    className = 'filmstrip__videos remote-videos'
                    columnCount = { _columns }
                    columnWidth = { _thumbnailWidth + TILE_HORIZONTAL_MARGIN }
                    height = { _filmstripHeight }
                    initialScrollLeft = { 0 }
                    initialScrollTop = { 0 }
                    itemKey = { this._gridItemKey }
                    onItemsRendered = { this._onGridItemsRendered }
                    overscanRowCount = { 1 }
                    rowCount = { _rows }
                    rowHeight = { _thumbnailHeight + TILE_VERTICAL_MARGIN }
                    width = { _filmstripWidth }>
                    {
                        ThumbnailWrapper
                    }
                </FixedSizeGrid>
            );
        }


        const props = {
            itemCount: _remoteParticipantsLength,
            className: 'filmstrip__videos remote-videos',
            height: _filmstripHeight,
            itemKey: this._listItemKey,
            itemSize: 0,
            onItemsRendered: this._onListItemsRendered,
            overscanCount: 1,
            width: _filmstripWidth,
            style: {
                willChange: 'auto'
            }
        };

        if (_currentLayout === LAYOUTS.HORIZONTAL_FILMSTRIP_VIEW) {
            const itemSize = _thumbnailWidth + TILE_HORIZONTAL_MARGIN;
            const isNotOverflowing = (_remoteParticipantsLength * itemSize) <= _filmstripWidth;

            props.itemSize = itemSize;

            // $FlowFixMe
            props.layout = 'horizontal';
            if (isNotOverflowing) {
                props.className += ' is-not-overflowing';
            }

        } else if (_currentLayout === LAYOUTS.VERTICAL_FILMSTRIP_VIEW) {
            const itemSize = _thumbnailHeight + TILE_VERTICAL_MARGIN;
            const isNotOverflowing = (_remoteParticipantsLength * itemSize) <= _filmstripHeight;

            if (isNotOverflowing) {
                props.className += ' is-not-overflowing';
            }

            props.itemSize = itemSize;
        }

        return (
            <FixedSizeList { ...props }>
                {
                    ThumbnailWrapper
                }
            </FixedSizeList>
        );
    }

    /**
     * Dispatches an action to change the visibility of the filmstrip.
     *
     * @private
     * @returns {void}
     */
    _doToggleFilmstrip() {
        this.props.dispatch(setFilmstripVisible(!this.props._visible));
    }

    _onShortcutToggleFilmstrip: () => void;

    /**
     * Creates an analytics keyboard shortcut event and dispatches an action for
     * toggling filmstrip visibility.
     *
     * @private
     * @returns {void}
     */
    _onShortcutToggleFilmstrip() {
        sendAnalytics(
            createShortcutEvent("toggle.filmstrip", {
                enable: this.props._visible,
            })
        );

        this._doToggleFilmstrip();
    }

    _onToolbarToggleFilmstrip: () => void;

    /**
     * Creates an analytics toolbar event and dispatches an action for opening
     * the speaker stats modal.
     *
     * @private
     * @returns {void}
     */
    _onToolbarToggleFilmstrip() {
        sendAnalytics(
            createToolbarEvent("toggle.filmstrip.button", {
                enable: this.props._visible,
            })
        );

        this._doToggleFilmstrip();
    }

    /**
     * Creates a React Element for changing the visibility of the filmstrip when
     * clicked.
     *
     * @private
     * @returns {ReactElement}
     */
    _renderToggleButton() {
        const icon = this.props._visible ? IconMenuDown : IconMenuUp;
        const { t } = this.props;

        return (
            <div
                className = 'filmstrip__toolbar'>
                <button
                    aria-expanded = { this.props._visible }
                    aria-label = { t('toolbar.accessibilityLabel.toggleFilmstrip') }
                    id = 'toggleFilmstripButton'
                    onClick = { this._onToolbarToggleFilmstrip }
                    onFocus = { this._onTabIn }
                    tabIndex = { 0 }>
                    <Icon
                        aria-label = { t('toolbar.accessibilityLabel.toggleFilmstrip') }
                        src = { icon } />
                </button>
            </div>
        );
    }
}

/**
 * Maps (parts of) the Redux state to the associated {@code Filmstrip}'s props.
 *
 * @param {Object} state - The Redux state.
 * @private
 * @returns {Props}
*/
function _mapStateToProps(state) {
/**
    const { iAmSipGateway } = state["features/base/config"];
    const { conference } = state["features/base/conference"];
    const toolbarButtons = getToolbarButtons(state);
    const { visible } = state["features/filmstrip"];
    const tracks = state["features/base/tracks"];
    const reduceHeight =
        state["features/toolbox"].visible && toolbarButtons.length;
    const remoteVideosVisible = shouldRemoteVideosBeVisible(state);
    const { isOpen: shiftRight } = state["features/chat"];
    const className = `${remoteVideosVisible ? "" : "hide-videos"} ${
        reduceHeight ? "reduce-height" : ""
    } ${shiftRight ? "shift-right" : ""}`.trim();
    const videosClassName = `filmstrip__videos${visible ? "" : " hidden"}`;
    const { gridDimensions = {}, filmstripWidth } = state[
        "features/filmstrip"
    ].tileViewDimensions;
    const { clientHeight } = state['features/base/responsive-ui'];
*/
    const toolbarButtons = getToolbarButtons(state);
    const { testing = {}, iAmRecorder } = state['features/base/config'];
    const enableThumbnailReordering = testing.enableThumbnailReordering ?? true;
    const { visible, remoteParticipants } = state['features/filmstrip'];
    const reduceHeight = state['features/toolbox'].visible && toolbarButtons.length;
    const remoteVideosVisible = shouldRemoteVideosBeVisible(state);
    const { isOpen: shiftRight } = state['features/chat'];
    const {
        gridDimensions = {},
        filmstripHeight,
        filmstripWidth,
        thumbnailSize: tileViewThumbnailSize
    } = state['features/filmstrip'].tileViewDimensions;
    const _currentLayout = getCurrentLayout(state);

    const { clientHeight, clientWidth } = state['features/base/responsive-ui'];
    const availableSpace = clientHeight - filmstripHeight;
    let filmstripPadding = 0;

    if (availableSpace > 0) {
        const paddingValue = TOOLBAR_HEIGHT_MOBILE - availableSpace;

        if (paddingValue > 0) {
            filmstripPadding = paddingValue;
        }
    } else {
        filmstripPadding = TOOLBAR_HEIGHT_MOBILE;
    }

    const collapseTileView = reduceHeight
        && isMobileBrowser()
        && clientWidth <= ASPECT_RATIO_BREAKPOINT;

    const className = `${remoteVideosVisible ? '' : 'hide-videos'} ${
        reduceHeight ? 'reduce-height' : ''
    } ${shiftRight ? 'shift-right' : ''} ${collapseTileView ? 'collapse' : ''}`.trim();
    const videosClassName = `filmstrip__videos${visible ? '' : ' hidden'}`;
    let _thumbnailSize, remoteFilmstripHeight, remoteFilmstripWidth;

    switch (_currentLayout) {
    case LAYOUTS.TILE_VIEW:
        _thumbnailSize = tileViewThumbnailSize;
        remoteFilmstripHeight = filmstripHeight - (collapseTileView && filmstripPadding > 0 ? filmstripPadding : 0);
        remoteFilmstripWidth = filmstripWidth;
        break;
    case LAYOUTS.VERTICAL_FILMSTRIP_VIEW: {
        const { remote, remoteVideosContainer } = state['features/filmstrip'].verticalViewDimensions;

        _thumbnailSize = remote;
        remoteFilmstripHeight = remoteVideosContainer?.height - (reduceHeight ? TOOLBAR_HEIGHT : 0);
        remoteFilmstripWidth = remoteVideosContainer?.width;
        break;
    }
    case LAYOUTS.HORIZONTAL_FILMSTRIP_VIEW: {
        const { remote, remoteVideosContainer } = state['features/filmstrip'].horizontalViewDimensions;

        _thumbnailSize = remote;
        remoteFilmstripHeight = remoteVideosContainer?.height;
        remoteFilmstripWidth = remoteVideosContainer?.width;
        break;
    }
    }

    return {
        _className: className,
        _columns: gridDimensions.columns,
        _recentActiveParticipants:
            state["features/base/participants/recentActive"],
        _currentLayout,
        _filmstripHeight: remoteFilmstripHeight,
        _filmstripWidth: remoteFilmstripWidth,
        _iAmRecorder: Boolean(iAmRecorder),
        _isFilmstripButtonEnabled: isButtonEnabled('filmstrip', state),
        _remoteParticipantsLength: remoteParticipants.length,
        _remoteParticipants: remoteParticipants,
        _rows: gridDimensions.rows,
        _thumbnailWidth: _thumbnailSize?.width,
        _thumbnailHeight: _thumbnailSize?.height,
        _thumbnailsReordered: enableThumbnailReordering,
        _videosClassName: videosClassName,
        _visible: visible,
        _clientHeight: clientHeight,
        _isToolboxVisible: isToolboxVisible(state)
    };
}

export default translate(connect(_mapStateToProps)(Filmstrip));
