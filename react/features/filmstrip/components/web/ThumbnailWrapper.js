/* @flow */
import React, { Component } from 'react';
import { shouldComponentUpdate } from 'react-window';

import { getSourceNameSignalingFeatureFlag } from '../../../base/config';
// sally
import { MEDIA_TYPE, VideoTrack } from '../../../base/media';
import { getCustomOrderedRemoteParticipants, getIsLocalTrainer, getLocalParticipant } from '../../../base/participants';
import { connect } from '../../../base/redux';
import { shouldHideSelfView } from '../../../base/settings/functions.any';
import { LAYOUTS, getCurrentLayout } from '../../../video-layout';
import { FILMSTRIP_TYPE, TILE_ASPECT_RATIO, TILE_HORIZONTAL_MARGIN } from '../../constants';
import { getActiveParticipantsIds, showGridInVerticalView } from '../../functions';


import Thumbnail from './Thumbnail';


// sally = custom remote participants ordering / filtering


/**
 * The type of the React {@code Component} props of {@link ThumbnailWrapper}.
 */
type Props = {

    /**
     * Whether or not to hide the self view.
     */
    _disableSelfView: boolean,

    /**
     * The type of filmstrip this thumbnail is displayed in.
     */
    _filmstripType: string,

    /**
     * The horizontal offset in px for the thumbnail. Used to center the thumbnails in the last row in tile view.
     */
    _horizontalOffset: number,

    /**
     * The ID of the participant associated with the Thumbnail.
     */
    _participantID: ?string,

    /**
     * Whether or not the thumbnail is a local screen share.
     */
    _isLocalScreenShare: boolean,

    /**
     * The width of the thumbnail. Used for expanding the width of the thumbnails on last row in case
     * there is empty space.
     */
    _thumbnailWidth: number,

    /**
     * The index of the column in tile view.
     */
    columnIndex?: number,

    /**
     * The index of the ThumbnailWrapper in stage view.
     */
    index?: number,

    /**
     * The index of the row in tile view.
     */
    rowIndex?: number,

    /**
     * The styles coming from react-window.
     */
    style: Object
};

/**
 * A wrapper Component for the Thumbnail that translates the react-window specific props
 * to the Thumbnail Component's props.
 */
class ThumbnailWrapper extends Component<Props> {

    /**
     * Creates new ThumbnailWrapper instance.
     *
     * @param {Props} props - The props of the component.
     */
    constructor(props: Props) {
        super(props);

        this.shouldComponentUpdate = shouldComponentUpdate.bind(this);
    }

    shouldComponentUpdate: Props => boolean;

    /**
     * Implements React's {@link Component#render()}.
     *
     * @inheritdoc
     * @returns {ReactElement}
     */
    render() {
        const {
            _disableSelfView,
            _filmstripType = FILMSTRIP_TYPE.MAIN,
            _isLocalScreenShare = false,
            _horizontalOffset = 0,
            _participantID,
            _thumbnailWidth,
            style
        } = this.props;

        if (typeof _participantID !== 'string') {
            return null;
        }

        if (_participantID === 'local') {
            return _disableSelfView ? null : (
                <Thumbnail
                    filmstripType = { _filmstripType }
                    horizontalOffset = { _horizontalOffset }
                    key = 'local'
                    style = { style }
                    width = { _thumbnailWidth } />);
        }

        if (_isLocalScreenShare) {
            return _disableSelfView ? null : (
                <Thumbnail
                    filmstripType = { _filmstripType }
                    horizontalOffset = { _horizontalOffset }
                    key = 'localScreenShare'
                    participantID = { _participantID }
                    style = { style }
                    width = { _thumbnailWidth } />);
        }

        return (
            <Thumbnail
                filmstripType = { _filmstripType }
                horizontalOffset = { _horizontalOffset }
                key = { `remote_${_participantID}` }
                participantID = { _participantID }
                style = { style }
                width = { _thumbnailWidth } />);
    }
}

/**
 * Maps (parts of) the Redux state to the associated {@code ThumbnailWrapper}'s props.
 *
 * @param {Object} state - The Redux state.
 * @param {Object} ownProps - The props passed to the component.
 * @private
 * @returns {Props}
 */
function _mapStateToProps(state, ownProps) {
    const _currentLayout = getCurrentLayout(state);
    //let { remoteParticipants } = state['features/filmstrip'];

    const { remote } = state["features/base/participants"];

    const activeParticipants = getActiveParticipantsIds(state);
    const { testing = {} } = state['features/base/config'];
    const disableSelfView = shouldHideSelfView(state);
     //const enableThumbnailReordering = testing.enableThumbnailReordering ?? true;
    // sally - ensure enabletumbnailreoderdering is false
    const enableThumbnailReordering = false;
    // sally = get custom ordered remote participants (visible)

   

    const sourceNameSignalingEnabled = getSourceNameSignalingFeatureFlag(state);
    const _verticalViewGrid = showGridInVerticalView(state);
    const filmstripType = ownProps.data?.filmstripType;
    const stageFilmstrip = filmstripType === FILMSTRIP_TYPE.STAGE;
    const sortedActiveParticipants = getCustomOrderedRemoteParticipants(state);
    // const remoteParticipants = stageFilmstrip ? sortedActiveParticipants : remote;
    //const remoteParticipantsLength = remoteParticipants.length;

    const remoteParticipantObj = getCustomOrderedRemoteParticipants(state);
    const remoteParticipants = remoteParticipantObj.map(p => p.id);
    console.log('HERE2');
    console.log(remoteParticipants);
    let remoteParticipantsLength = remoteParticipants.length;
    //const isLocalTrainer = getIsLocalTrainer(state);
    const localId = getLocalParticipant(state).id;

    if (_currentLayout === LAYOUTS.TILE_VIEW || _verticalViewGrid || stageFilmstrip) {
        const { columnIndex, rowIndex } = ownProps;
        const { tileViewDimensions, stageFilmstripDimensions, verticalViewDimensions } = state['features/filmstrip'];
        const { gridView } = verticalViewDimensions;
        let gridDimensions = tileViewDimensions.gridDimensions,
            thumbnailSize = tileViewDimensions.thumbnailSize;

        if (stageFilmstrip) {
            gridDimensions = stageFilmstripDimensions.gridDimensions;
            thumbnailSize = stageFilmstripDimensions.thumbnailSize;
        } else if (_verticalViewGrid) {
            gridDimensions = gridView.gridDimensions;
            thumbnailSize = gridView.thumbnailSize;
        }
        const { columns, rows } = gridDimensions;
        const index = (rowIndex * columns) + columnIndex;
        let horizontalOffset, thumbnailWidth;
        const { iAmRecorder, disableTileEnlargement } = state['features/base/config'];
        const { localScreenShare } = state['features/base/participants'];
        const localParticipantsLength = localScreenShare ? 2 : 1;

        let participantsLength;

        if (stageFilmstrip) {
            // We use the length of activeParticipants in stage filmstrip which includes local participants.
            participantsLength = remoteParticipantsLength;
        } else if (sourceNameSignalingEnabled) {
            // We need to include the local screenshare participant in tile view.
            participantsLength = remoteParticipantsLength

            // Add local camera and screen share to total participant count when self view is not disabled.
            + (disableSelfView ? 0 : localParticipantsLength)

            // Removes iAmRecorder from the total participants count.
            - (iAmRecorder ? 1 : 0);
        } else {
            participantsLength = remoteParticipantsLength + (iAmRecorder ? 0 : 1) - (disableSelfView ? 1 : 0);
        }

        if (rowIndex === rows - 1) { // center the last row
            const partialLastRowParticipantsNumber = participantsLength % columns;

            if (partialLastRowParticipantsNumber > 0) {
                const { width, height } = thumbnailSize;
                const availableWidth = columns * (width + TILE_HORIZONTAL_MARGIN);
                let widthDifference = 0;
                let widthToUse = width;

                if (!disableTileEnlargement) {
                    thumbnailWidth = Math.min(
                        (availableWidth / partialLastRowParticipantsNumber) - TILE_HORIZONTAL_MARGIN,
                        height * TILE_ASPECT_RATIO);
                    widthDifference = thumbnailWidth - width;
                    widthToUse = thumbnailWidth;
                }

                horizontalOffset
                    = Math.floor((availableWidth
                        - (partialLastRowParticipantsNumber * (widthToUse + TILE_HORIZONTAL_MARGIN))) / 2
                    )
                    + (columnIndex * widthDifference);
            }
        }

        if (index > participantsLength - 1) {
            return {};
        }

        if (stageFilmstrip) {
            return {
                _disableSelfView: disableSelfView,
                _filmstripType: filmstripType,
                _participantID: remoteParticipants[index] === localId ? 'local' : remoteParticipants[index],
                _horizontalOffset: horizontalOffset,
                _thumbnailWidth: thumbnailWidth
            };
        }

        // When the thumbnails are reordered, local participant is inserted at index 0.
        // const localIndex = enableThumbnailReordering && !disableSelfView ? 0 : remoteParticipantsLength;

        // // Local screen share is inserted at index 1 after the local camera.
        const localScreenShareIndex = enableThumbnailReordering && !disableSelfView ? 1 : remoteParticipantsLength;

        // let remoteIndex;

        // if (sourceNameSignalingEnabled) {
        //     remoteIndex = enableThumbnailReordering && !iAmRecorder && !disableSelfView
        //         ? index - localParticipantsLength : index;
        // } else {
        //     remoteIndex = enableThumbnailReordering && !iAmRecorder && !disableSelfView ? index - 1 : index;
        // }

        // sally undo trainer local reorder
        const localIndex = enableThumbnailReordering ? 0 : remoteParticipantsLength;
        const remoteIndex = enableThumbnailReordering && !iAmRecorder ? index - 1 : index;

        if (!iAmRecorder && index === localIndex) {
            return {
                _disableSelfView: disableSelfView,
                _filmstripType: filmstripType,
                _participantID: 'local',
                _horizontalOffset: horizontalOffset,
                _thumbnailWidth: thumbnailWidth
            };
        }

        if (sourceNameSignalingEnabled && !iAmRecorder && localScreenShare && index === localScreenShareIndex) {
            return {
                _disableSelfView: disableSelfView,
                _filmstripType: filmstripType,
                _isLocalScreenShare: true,
                _participantID: localScreenShare?.id,
                _horizontalOffset: horizontalOffset,
                _thumbnailWidth: thumbnailWidth
            };
        }

        return {
            _filmstripType: filmstripType,
            _participantID: remoteParticipants[remoteIndex],
            _horizontalOffset: horizontalOffset,
            _thumbnailWidth: thumbnailWidth
        };
    }

    if (_currentLayout === LAYOUTS.STAGE_FILMSTRIP_VIEW && filmstripType === FILMSTRIP_TYPE.SCREENSHARE) {
        const { screenshareFilmstripParticipantId } = state['features/filmstrip'];
        const screenshares = state['features/video-layout'].remoteScreenShares;
        let id = screenshares.find(sId => sId === screenshareFilmstripParticipantId);

        if (!id && screenshares.length) {
            id = screenshares[screenshares.length - 1];
        }

        return {
            _filmstripType: filmstripType,
            _participantID: id
        };
    }

    const { index } = ownProps;

    if (typeof index !== 'number' || remoteParticipantsLength <= index) {
        return {};
    }

    return {
        _participantID: remoteParticipants[index]
    };
}

export default connect(_mapStateToProps)(ThumbnailWrapper);
