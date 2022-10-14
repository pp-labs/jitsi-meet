import debounce from 'lodash/debounce';

import { IStore } from '../../app/types';
import { SET_FILMSTRIP_ENABLED } from '../../filmstrip/actionTypes';
import { SELECT_LARGE_VIDEO_PARTICIPANT } from '../../large-video/actionTypes';
import { APP_STATE_CHANGED } from '../../mobile/background/actionTypes';
import { LAYOUTS, getCurrentLayout, getTileViewGridDimensions, shouldDisplayTileView } from '../../video-layout';
import {
    SCREEN_SHARE_REMOTE_PARTICIPANTS_UPDATED,
    SET_CAR_MODE,
    SET_TILE_VIEW,
    VIRTUAL_SCREENSHARE_REMOTE_PARTICIPANTS_UPDATED
} from '../../video-layout/actionTypes';
import { SET_AUDIO_ONLY } from '../audio-only/actionTypes';
// eslint-disable-next-line import/order
import { CONFERENCE_JOINED } from '../conference/actionTypes';
import {
    PARTICIPANT_JOINED,
    PARTICIPANT_KICKED,
    PARTICIPANT_LEFT
} from '../participants/actionTypes';
import {
    getParticipantById,
    getParticipantCount
} from '../participants/functions';
import { MiddlewareRegistry } from '../redux';
import {
    CLIENT_RESIZED
} from '../responsive-ui/actionTypes';
import { isLocalVideoTrackDesktop } from '../tracks/functions';

import { setLastN } from './actions';
import { limitLastN } from './functions';
import logger from './logger';

/**
 * Updates the last N value in the conference based on the current state of the redux store.
 *
 * @param {Store} store - The redux store.
 * @private
 * @returns {void}
 */
const _updateLastN = debounce(({ dispatch, getState }: IStore) => {
    const state = getState();
    const { conference } = state['features/base/conference'];

    if (!conference) {
        logger.debug('There is no active conference, not updating last N');

        return;
    }

    const { enabled: audioOnly } = state['features/base/audio-only'];
    const { appState } = state['features/background'] || {};
    const { enabled: filmStripEnabled } = state['features/filmstrip'];
    const config = state['features/base/config'];
    const { lastNLimits } = state['features/base/lastn'];
    const participantCount = getParticipantCount(state);
    const { carMode } = state['features/video-layout'];

    // Select the (initial) lastN value based on the following preference order.
    // 1. The last-n value from 'startLastN' if it is specified in config.js
    // 2. The last-n value from 'channelLastN' if specified in config.js.
    // 3. -1 as the default value.
    let lastNSelected = config.startLastN ?? (config.channelLastN ?? -1);

    // Apply last N limit based on the # of participants and config settings.
    // @ts-ignore
    const limitedLastN = limitLastN(participantCount, lastNLimits);

    if (limitedLastN !== undefined) {
        lastNSelected = lastNSelected === -1 ? limitedLastN : Math.min(limitedLastN, lastNSelected);
    }

    if (typeof appState !== 'undefined' && appState !== 'active') {
        lastNSelected = isLocalVideoTrackDesktop(state) ? 1 : 0;
    } else if (carMode) {
        lastNSelected = 0;
    } else if (audioOnly) {
        const { remoteScreenShares, tileViewEnabled } = state['features/video-layout'];
        const largeVideoParticipantId = state['features/large-video'].participantId;
        const largeVideoParticipant
            = largeVideoParticipantId ? getParticipantById(state, largeVideoParticipantId) : undefined;

        // Use tileViewEnabled state from redux here instead of determining if client should be in tile
        // view since we make an exception only for screenshare when in audio-only mode. If the user unpins
        // the screenshare, lastN will be set to 0 here. It will be set to 1 if screenshare has been auto pinned.
        if (!tileViewEnabled && largeVideoParticipant && !largeVideoParticipant.local) {
            lastNSelected = (remoteScreenShares || []).includes(largeVideoParticipantId ?? '') ? 1 : 0;
        } else {
            lastNSelected = 0;
        }
    } else if (!filmStripEnabled) {
        lastNSelected = 1;
    }

    dispatch(setLastN(lastNSelected));
}, 1000); /* Don't send this more often than once a second. */


MiddlewareRegistry.register((store: IStore) => (next: (arg0: any) => any) => (action: { type: any; }) => {
    const result = next(action);


    // sally - set lastn on client resise
    switch (action.type) {
    case CLIENT_RESIZED:
    case APP_STATE_CHANGED:
    case CONFERENCE_JOINED:
    case PARTICIPANT_JOINED:
    case PARTICIPANT_KICKED:
    case PARTICIPANT_LEFT:
    case SCREEN_SHARE_REMOTE_PARTICIPANTS_UPDATED:
    case SELECT_LARGE_VIDEO_PARTICIPANT:
    case SET_AUDIO_ONLY:
    case SET_CAR_MODE:
    case SET_FILMSTRIP_ENABLED:
    case SET_TILE_VIEW:
    case VIRTUAL_SCREENSHARE_REMOTE_PARTICIPANTS_UPDATED:
        _updateLastN(store);
        break;
    }

    return result;
});

/**
 * Updates the last N value in the conference based on the current state of the redux store.
 *
 * @param {Store} store - The redux store.
 * @private
 * @returns {void}
 */
function _updateLastN({ getState }) {
    const state = getState();
    const { conference } = state['features/base/conference'];
    const { enabled: audioOnly } = state['features/base/audio-only'];
    const { appState } = state['features/background'] || {};
    const { enabled: filmStripEnabled } = state['features/filmstrip'];
    const config = state['features/base/config'];
    const { lastNLimits } = state['features/base/lastn'];
    const participantCount = getParticipantCount(state);


    // sally
    const layout = getCurrentLayout(state);
    const { clientHeight } = state['features/base/responsive-ui'];

    if (!conference) {
        logger.debug('There is no active conference, not updating last N');

        return;
    }

    let lastN = typeof config.channelLastN === 'undefined' ? -1 : config.channelLastN;

    // Apply last N limit based on the # of participants and channelLastN settings.
    const limitedLastN = limitLastN(participantCount, lastNLimits);

    if (limitedLastN !== undefined) {
        lastN = lastN === -1 ? limitedLastN : Math.min(limitedLastN, lastN);
    }

    // sally  - hard code lastn to 8 for Tile View
    if (layout === LAYOUTS.TILE_VIEW) {
        lastN = 5;
    } else {
        // dynamically set lastN when not in tile view based on client height
        lastN = Math.round(clientHeight / 200) + 1;
    }

    if (typeof appState !== 'undefined' && appState !== 'active') {
        lastN = isLocalVideoTrackDesktop(state) ? 1 : 0;
    } else if (audioOnly) {
        const { remoteScreenShares, tileViewEnabled } = state['features/video-layout'];
        const largeVideoParticipantId = state['features/large-video'].participantId;
        const largeVideoParticipant
            = largeVideoParticipantId ? getParticipantById(state, largeVideoParticipantId) : undefined;

        // Use tileViewEnabled state from redux here instead of determining if client should be in tile
        // view since we make an exception only for screenshare when in audio-only mode. If the user unpins
        // the screenshare, lastN will be set to 0 here. It will be set to 1 if screenshare has been auto pinned.
        if (!tileViewEnabled && largeVideoParticipant && !largeVideoParticipant.local) {
            lastN = (remoteScreenShares || []).includes(largeVideoParticipantId) ? 1 : 0;
        } else {
            lastN = 0;
        }
    } else if (!filmStripEnabled) {
        lastN = 1;
    }

    if (conference.getLastN() === lastN) {
        return;
    }

    logger.info(`Setting last N to: ${lastN}`);

    try {
        conference.setLastN(lastN);
    } catch (err) {
        logger.error(`Failed to set lastN: ${err}`);
    }
}
