/* @flow */

import React, { PureComponent } from 'react';
import { FixedSizeGrid, FixedSizeList } from 'react-window';
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
     * Whether the filmstrip scrollbar should be hidden or not.
     */
    _hideScrollbar: boolean,

    /**
     * Whether the filmstrip toolbar should be hidden or not.
     */
    _hideToolbar: boolean,

    /**
     * Whether the filmstrip button is enabled.
     */
    _isFilmstripButtonEnabled: boolean,

    /**
     * The participants in the call.
     */
    _participants: Array<Object>,

    /**
     * The number of rows in tile view.
     */
    _rows: number,

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
 * @augments Component
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
            'F',
            'filmstripPopover',
            this._onShortcutToggleFilmstrip,
            'keyboardShortcuts.toggleFilmstrip'
        );
    }

    /**
     * Implements React's {@link Component#componentDidUpdate}.
     *
     * @inheritdoc
     */
    componentWillUnmount() {
        APP.keyboardshortcut.unregisterShortcut('F');
    }

    /**
     * Implements React's {@link Component#render()}.
     *
     * @inheritdoc
     * @returns {ReactElement}
     */
    render() {


        const filmstripRemoteVideosContainerStyle = {};
        const {
            _currentLayout,
            _participants,
            _isDominantSpeakerDisabled,
            _clientHeight,
            _tracks,
            _recentActiveParticipants
        } = this.props;
        let remoteParticipants = _participants.filter(p => !p.local);
        const localParticipant = getLocalParticipant(_participants);
        const tileViewActive = _currentLayout === LAYOUTS.TILE_VIEW;
        let maxVisableRemoteParticipants = 5;

        // sally - no trainer in left side
        if (!tileViewActive) {
            remoteParticipants = _participants.filter(
                p => !p.name?.startsWith('Trainer') && !p.local
            );

            // sally - height minus toolbar (80) minus local video (120), divide by thumb height
            maxVisableRemoteParticipants = Math.floor((_clientHeight - 200) / 120);
        } else {
            maxVisableRemoteParticipants = 5;
        }

        // sally order participants
        remoteParticipants = remoteParticipants.map(p => {
            if (p.name.startsWith('Trainer')) {
                p.order = 1;

                return p;
            }
            const isLocal = p?.local ?? true;

            if (isLocal) {
                p.order = 200;

                return p;
            }
            const recentParticipantIndex = _recentActiveParticipants.findIndex(
                part => part.id === p.id
            );

            if (p?.connectionStatus !== 'active') {
                p.order = 100 + recentParticipantIndex;

                return p;
            }
            const isRemoteParticipant = !p?.isFakeParticipant && !p?.local;
            const participantID = p.id;
            const _videoTrack = getTrackByMediaTypeAndParticipant(
                _tracks,
                MEDIA_TYPE.VIDEO,
                participantID
            );
            const videoStreamMuted = _videoTrack
                ? _videoTrack.muted
                : 'no stream';
            const isScreenSharing = _videoTrack?.videoType === 'desktop';

            if (isRemoteParticipant && isScreenSharing) {
                p.order = 2;

                return p;
            }

            // sally - recent participants

            if (recentParticipantIndex > -1) {
                p.order = 10 + recentParticipantIndex;

                return p;
            }

            if (isRemoteParticipant && !videoStreamMuted) {
                p.order = 20;

                return p;
            }

            // const _audioTrack = isLocal
            //     ? getLocalAudioTrack(_tracks) : getTrackByMediaTypeAndParticipant(_tracks, MEDIA_TYPE.AUDIO, participantID);

            // sally - don't prioritize audio only to prevent jumping
            // if (isRemoteParticipant && _audioTrack && !_audioTrack.muted) {
            //     p.order = 5;
            //     return p;
            // }

            p.order = 30;

            return p;

            // const isRemoteParticipant: !participant?.isFakeParticipant && !participant?.local;
            // const { id } = participant;
            // const isLocal = participant?.local ?? true;
            // const tracks = state['features/base/tracks'];
            // const _videoTrack = isLocal
            //     ? getLocalVideoTrack(tracks) : getTrackByMediaTypeAndParticipant(tracks, MEDIA_TYPE.VIDEO, participantID);
            // const _audioTrack = isLocal
            //     ? getLocalAudioTrack(tracks) : getTrackByMediaTypeAndParticipant(tracks, MEDIA_TYPE.AUDIO, participantID);
            // if (isRemoteParticipant && (dmInput.isVideoPlayable && !dmInput.videoStreamMuted)
        });
        remoteParticipants.sort((a, b) => {
            if (a.order === b.order) {
                return 0;
            }

            return a.order > b.order ? 1 : -1;
        });

        // sally - order dominant speaker only if they are outside the box
        try {
            if (
                !_isDominantSpeakerDisabled
                && remoteParticipants.length > maxVisableRemoteParticipants
            ) {
                const i = remoteParticipants.findIndex(p => p?.dominantSpeaker);

                if (i !== -1 && i >= maxVisableRemoteParticipants) {
                    remoteParticipants[i].order = 3;
                }
                remoteParticipants.sort((a, b) => {
                    if (a.order === b.order) {
                        return 0;
                    }

                    return a.order > b.order ? 1 : -1;
                });
            }
        } catch (e) {
            console.log(e);
        }

        // if (!_isDominantSpeakerDisabled && p?.dominantSpeaker) {
        //         p.order = 3
        //         return p;
        //     }

        //     // sally - recent participants

        //     if (recentParticipantIndex > -1) {
        //         p.order = 10 + recentParticipantIndex;
        //         return p;
        //     }

        const trainers = _participants.filter(
            p => p.name?.startsWith('Trainer')
        );


        // const trainer = _participants.find(p => p.name.startsWith('Trainer'));
        switch (_currentLayout) {
        case LAYOUTS.VERTICAL_FILMSTRIP_VIEW:
            // Adding 18px for the 2px margins, 2px borders on the left and right and 5px padding on the left and right.
            // Also adding 7px for the scrollbar.
            filmstripStyle.maxWidth
                    = (interfaceConfig.FILM_STRIP_MAX_HEIGHT || 120) + 25;
            break;
        case LAYOUTS.TILE_VIEW: {
            // The size of the side margins for each tile as set in CSS.
            const { _columns, _rows, _filmstripWidth } = this.props;

            if (_rows > _columns) {
                remoteVideoContainerClassName += ' has-overflow';
            }

            filmstripRemoteVideosContainerStyle.width = _filmstripWidth;
            break;
        }
        }

        let remoteVideosWrapperClassName = 'filmstrip__videos ';

        if (this.props._hideScrollbar) {
            remoteVideosWrapperClassName += ' hide-scrollbar';

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

        if (!this.props._hideToolbar && this.props._isFilmstripButtonEnabled) {
            toolbar = this._renderToggleButton();
        }

        return (
            <div
                className = { `filmstrip ${this.props._className}` }
                style = { filmstripStyle }>
                {/* sally - move tooldbar button*/}
                {/* { toolbar }*/}
                <div
                    className = { this.props._videosClassName }
                    id = 'remoteVideos'>
                    <div
                        className = 'filmstrip__videos'
                        id = 'filmstripLocalVideo'>
                        <div id = 'filmstripLocalVideoThumbnail'>
                            {!tileViewActive && (
                                <Thumbnail
                                    key = 'local'
                                    participantID = { localParticipant.id } />
                            )}
                        </div>
                    </div>
                    <div
                        className = { remoteVideosWrapperClassName }
                        id = 'filmstripRemoteVideos'>
                        {/*
                         * XXX This extra video container is needed for
                         * scrolling thumbnails in Firefox; otherwise, the flex
                         * thumbnails resize instead of causing overflow.
                         */}
                        <div
                            className = { remoteVideoContainerClassName }
                            id = 'filmstripRemoteVideosContainer'
                            style = { filmstripRemoteVideosContainerStyle }>
                            {remoteParticipants.map((p, i) => {
                                const isHidden
                                    = Boolean(maxVisableRemoteParticipants !== -1
                                    && maxVisableRemoteParticipants - 1 < i);

                                return (
                                    <Thumbnail
                                        hidden = { isHidden }
                                        key = { `remote_${p.id}` }
                                        participantID = { p.id } />
                                );
                            })}
                            <div id = 'trainerVideoVerticalViewContainer'>
                                {!tileViewActive && trainers.map(trainer => (
                                    <Thumbnail
                                        key = { `remote_${trainer.id}` }
                                        participantID = { trainer.id } />
                                ))}
                            </div>
                            <div id = 'localVideoTileViewContainer'>
                                {tileViewActive && (
                                    <Thumbnail
                                        key = 'local'
                                        participantID = { localParticipant.id } />
                                )}
                            </div>
                        </div>
                    </div>
                    {/* { moved toolbar button }*/}
                    {toolbar}
                </div>
            </div>
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
            createShortcutEvent('toggle.filmstrip', {
                enable: this.props._visible
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
            createToolbarEvent('toggle.filmstrip.button', {
                enable: this.props._visible
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
            <div className = 'filmstrip__toolbar'>
                <button
                    aria-label = { t('toolbar.accessibilityLabel.toggleFilmstrip') }
                    id = 'toggleFilmstripButton'
                    onClick = { this._onToolbarToggleFilmstrip }>
                    <Icon src = { icon } />
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
    const { iAmSipGateway } = state['features/base/config'];
    const { conference } = state['features/base/conference'];
    const toolbarButtons = getToolbarButtons(state);
    const { visible } = state['features/filmstrip'];
    const tracks = state['features/base/tracks'];
    const reduceHeight
        = state['features/toolbox'].visible && toolbarButtons.length;
    const remoteVideosVisible = shouldRemoteVideosBeVisible(state);
    const { isOpen: shiftRight } = state['features/chat'];
    const className = `${remoteVideosVisible ? '' : 'hide-videos'} ${
        reduceHeight ? 'reduce-height' : ''
    } ${shiftRight ? 'shift-right' : ''}`.trim();
    const videosClassName = `filmstrip__videos${visible ? '' : ' hidden'}`;
    const { gridDimensions = {}, filmstripWidth } = state[
        'features/filmstrip'
    ].tileViewDimensions;
    const { clientHeight } = state['features/base/responsive-ui'];

    return {
        _className: className,
        _columns: gridDimensions.columns,
        _recentActiveParticipants:
            state['features/base/participants/recentActive'],
        _currentLayout,
        _filmstripHeight: remoteFilmstripHeight,
        _filmstripWidth: remoteFilmstripWidth,
        _iAmRecorder: Boolean(iAmRecorder),
        _isFilmstripButtonEnabled: isButtonEnabled('filmstrip', state),
        _remoteParticipantsLength: remoteParticipants.length,
        _remoteParticipants: remoteParticipants,
        _rows: gridDimensions.rows,
        _videosClassName: videosClassName,
        _visible: visible,
        _clientHeight: clientHeight,
        _isToolboxVisible: isToolboxVisible(state)
    };
}

export default translate(connect(_mapStateToProps)(Filmstrip));
