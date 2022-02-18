// @flow

import { getGravatarURL } from '@jitsi/js-utils/avatar';
import type { Store } from 'redux';

import { GRAVATAR_BASE_URL, isCORSAvatarURL } from '../avatar';
import { JitsiParticipantConnectionStatus } from '../lib-jitsi-meet';
import { MEDIA_TYPE, shouldRenderVideoTrack } from '../media';
import { toState } from '../redux';
import { getTrackByMediaTypeAndParticipant } from '../tracks';
import { createDeferred } from '../util';

import {
    JIGASI_PARTICIPANT_ICON,
    MAX_DISPLAY_NAME_LENGTH,
    PARTICIPANT_ROLE
} from './constants';
import { preloadImage } from './preloadImage';

/* sally addditional imports */

import { getCurrentLayout, LAYOUTS } from '../../video-layout';

import { VideoTrack } from "../media";

import {
    getLocalAudioTrack,
    getLocalVideoTrack,
    updateLastTrackVideoMediaEvent,
} from "../tracks";

// end sally additional imports


/**
 * Temp structures for avatar urls to be checked/preloaded.
 */
const AVATAR_QUEUE = [];
const AVATAR_CHECKED_URLS = new Map();
/* eslint-disable arrow-body-style, no-unused-vars */
const AVATAR_CHECKER_FUNCTIONS = [
    (participant, _) => {
        return participant && participant.isJigasi ? JIGASI_PARTICIPANT_ICON : null;
    },
    (participant, _) => {
        return participant && participant.avatarURL ? participant.avatarURL : null;
    },
    (participant, store) => {
        if (participant && participant.email) {
            // TODO: remove once libravatar has deployed their new scaled up infra. -saghul
            const gravatarBaseURL
                = store.getState()['features/base/config'].gravatarBaseURL ?? GRAVATAR_BASE_URL;

            return getGravatarURL(participant.email, gravatarBaseURL);
        }

        return null;
    }
];
/* eslint-enable arrow-body-style, no-unused-vars */

/**
 * Resolves the first loadable avatar URL for a participant.
 *
 * @param {Object} participant - The participant to resolve avatars for.
 * @param {Store} store - Redux store.
 * @returns {Promise}
 */
export function getFirstLoadableAvatarUrl(participant: Object, store: Store<any, any>) {
    const deferred = createDeferred();
    const fullPromise = deferred.promise
        .then(() => _getFirstLoadableAvatarUrl(participant, store))
        .then(result => {

            if (AVATAR_QUEUE.length) {
                const next = AVATAR_QUEUE.shift();

                next.resolve();
            }

            return result;
        });

    if (AVATAR_QUEUE.length) {
        AVATAR_QUEUE.push(deferred);
    } else {
        deferred.resolve();
    }

    return fullPromise;
}

/**
 * Returns local participant from Redux state.
 *
 * @param {(Function|Object)} stateful - The (whole) redux state, or redux's
 * {@code getState} function to be used to retrieve the state
 * features/base/participants.
 * @returns {(Participant|undefined)}
 */
export function getLocalParticipant(stateful: Object | Function) {
    const state = toState(stateful)['features/base/participants'];

    return state.local;
}

/**
 * Normalizes a display name so then no invalid values (padding, length...etc)
 * can be set.
 *
 * @param {string} name - The display name to set.
 * @returns {string}
 */
export function getNormalizedDisplayName(name: string) {
    if (!name || !name.trim()) {
        return undefined;
    }

    return name.trim().substring(0, MAX_DISPLAY_NAME_LENGTH);
}

/**
 * Returns participant by ID from Redux state.
 *
 * @param {(Function|Object)} stateful - The (whole) redux state, or redux's
 * {@code getState} function to be used to retrieve the state
 * features/base/participants.
 * @param {string} id - The ID of the participant to retrieve.
 * @private
 * @returns {(Participant|undefined)}
 */
export function getParticipantById(
        stateful: Object | Function, id: string): ?Object {
    const state = toState(stateful)['features/base/participants'];
    const { local, remote } = state;

    return remote.get(id) || (local?.id === id ? local : undefined);
}

/**
 * Returns the participant with the ID matching the passed ID or the local participant if the ID is
 * undefined.
 *
 * @param {(Function|Object)} stateful - The (whole) redux state, or redux's
 * {@code getState} function to be used to retrieve the state
 * features/base/participants.
 * @param {string|undefined} [participantID] - An optional partipantID argument.
 * @returns {Participant|undefined}
 */
export function getParticipantByIdOrUndefined(stateful: Object | Function, participantID: ?string) {
    return participantID ? getParticipantById(stateful, participantID) : getLocalParticipant(stateful);
}

/**
 * Returns a count of the known participants in the passed in redux state,
 * excluding any fake participants.
 *
 * @param {(Function|Object)} stateful - The (whole) redux state, or redux's
 * {@code getState} function to be used to retrieve the state
 * features/base/participants.
 * @returns {number}
 */
export function getParticipantCount(stateful: Object | Function) {
    const state = toState(stateful)['features/base/participants'];
    const { local, remote, fakeParticipants } = state;

    return remote.size - fakeParticipants.size + (local ? 1 : 0);
}

/**
 * Returns the Map with fake participants.
 *
 * @param {(Function|Object)} stateful - The (whole) redux state, or redux's
 * {@code getState} function to be used to retrieve the state
 * features/base/participants.
 * @returns {Map<string, Participant>} - The Map with fake participants.
 */
export function getFakeParticipants(stateful: Object | Function) {
    return toState(stateful)['features/base/participants'].fakeParticipants;
}

/**
 * Returns a count of the known remote participants in the passed in redux state.
 *
 * @param {(Function|Object)} stateful - The (whole) redux state, or redux's
 * {@code getState} function to be used to retrieve the state
 * features/base/participants.
 * @returns {number}
 */
export function getRemoteParticipantCount(stateful: Object | Function) {
    const state = toState(stateful)['features/base/participants'];

    return state.remote.size;
}

/**
 * Returns a count of the known participants in the passed in redux state,
 * including fake participants.
 *
 * @param {(Function|Object)} stateful - The (whole) redux state, or redux's
 * {@code getState} function to be used to retrieve the state
 * features/base/participants.
 * @returns {number}
 */
export function getParticipantCountWithFake(stateful: Object | Function) {
    const state = toState(stateful)['features/base/participants'];
    const { local, remote } = state;

    return remote.size + (local ? 1 : 0);
}

/**
 * Returns participant's display name.
 *
 * @param {(Function|Object)} stateful - The (whole) redux state, or redux's
 * {@code getState} function to be used to retrieve the state.
 * @param {string} id - The ID of the participant's display name to retrieve.
 * @returns {string}
 */
export function getParticipantDisplayName(
        stateful: Object | Function,
        id: string) {
    const participant = getParticipantById(stateful, id);
    const {
        defaultLocalDisplayName,
        defaultRemoteDisplayName
    } = toState(stateful)['features/base/config'];

    if (participant) {
        if (participant.name) {
            return participant.name;
        }

        if (participant.local) {
            return defaultLocalDisplayName;
        }
    }

    return defaultRemoteDisplayName;
}

/**
 * Returns the presence status of a participant associated with the passed id.
 *
 * @param {(Function|Object)} stateful - The (whole) redux state, or redux's
 * {@code getState} function to be used to retrieve the state.
 * @param {string} id - The id of the participant.
 * @returns {string} - The presence status.
 */
export function getParticipantPresenceStatus(
        stateful: Object | Function, id: string) {
    if (!id) {
        return undefined;
    }
    const participantById = getParticipantById(stateful, id);

    if (!participantById) {
        return undefined;
    }

    return participantById.presence;
}

/**
 * Returns true if there is at least 1 participant with screen sharing feature and false otherwise.
 *
 * @param {(Function|Object)} stateful - The (whole) redux state, or redux's
 * {@code getState} function to be used to retrieve the state.
 * @returns {boolean}
 */
export function haveParticipantWithScreenSharingFeature(stateful: Object | Function) {
    return toState(stateful)['features/base/participants'].haveParticipantWithScreenSharingFeature;
}

/**
 * Selectors for getting all remote participants.
 *
 * @param {(Function|Object)} stateful - The (whole) redux state, or redux's
 * {@code getState} function to be used to retrieve the state
 * features/base/participants.
 * @returns {Map<string, Object>}
 */
export function getRemoteParticipants(stateful: Object | Function) {
    return toState(stateful)['features/base/participants'].remote;
}

/**
 * Selectors for the getting the remote participants in the order that they are displayed in the filmstrip.
 *
@param {(Function|Object)} stateful - The (whole) redux state, or redux's {@code getState} function to be used to
 * retrieve the state features/filmstrip.
 * @returns {Array<string>}
 */
export function getRemoteParticipantsSorted(stateful: Object | Function) {
    return toState(stateful)['features/filmstrip'].remoteParticipants;
}

/**
 * Returns the participant which has its pinned state set to truthy.
 *
 * @param {(Function|Object)} stateful - The (whole) redux state, or redux's
 * {@code getState} function to be used to retrieve the state
 * features/base/participants.
 * @returns {(Participant|undefined)}
 */
export function getPinnedParticipant(stateful: Object | Function) {
    const state = toState(stateful)['features/base/participants'];
    const { pinnedParticipant } = state;

    if (!pinnedParticipant) {
        return undefined;
    }

    return getParticipantById(stateful, pinnedParticipant);
}

/**
 * Returns true if the participant is a moderator.
 *
 * @param {string} participant - Participant object.
 * @returns {boolean}
 */
export function isParticipantModerator(participant: Object) {
    return participant?.role === PARTICIPANT_ROLE.MODERATOR;
}

/**
 * Returns the dominant speaker participant.
 *
 * @param {(Function|Object)} stateful - The (whole) redux state or redux's
 * {@code getState} function to be used to retrieve the state features/base/participants.
 * @returns {Participant} - The participant from the redux store.
 */
export function getDominantSpeakerParticipant(stateful: Object | Function) {
    const state = toState(stateful)['features/base/participants'];
    const { dominantSpeaker } = state;

    if (!dominantSpeaker) {
        return undefined;
    }

    return getParticipantById(stateful, dominantSpeaker);
}

/**
 * Returns true if all of the meeting participants are moderators.
 *
 * @param {Object|Function} stateful -Object or function that can be resolved
 * to the Redux state.
 * @returns {boolean}
 */
export function isEveryoneModerator(stateful: Object | Function) {
    const state = toState(stateful)['features/base/participants'];

    return state.everyoneIsModerator === true;
}

/**
 * Checks a value and returns true if it's a preloaded icon object.
 *
 * @param {?string | ?Object} icon - The icon to check.
 * @returns {boolean}
 */
export function isIconUrl(icon: ?string | ?Object) {
    return Boolean(icon) && (typeof icon === 'object' || typeof icon === 'function');
}

/**
 * Returns true if the current local participant is a moderator in the
 * conference.
 *
 * @param {Object|Function} stateful - Object or function that can be resolved
 * to the Redux state.
 * @returns {boolean}
 */
export function isLocalParticipantModerator(stateful: Object | Function) {
    const state = toState(stateful)['features/base/participants'];

    const { local } = state;

    if (!local) {
        return false;
    }

    return isParticipantModerator(local);
}

/**
 * Returns true if the video of the participant should be rendered.
 * NOTE: This is currently only used on mobile.
 *
 * @param {Object|Function} stateful - Object or function that can be resolved
 * to the Redux state.
 * @param {string} id - The ID of the participant.
 * @returns {boolean}
 */
export function shouldRenderParticipantVideo(stateful: Object | Function, id: string) {
    const state = toState(stateful);
    const participant = getParticipantById(state, id);

    if (!participant) {
        return false;
    }

    /* First check if we have an unmuted video track. */
    const videoTrack
        = getTrackByMediaTypeAndParticipant(state['features/base/tracks'], MEDIA_TYPE.VIDEO, id);

    if (!shouldRenderVideoTrack(videoTrack, /* waitForVideoStarted */ false)) {
        return false;
    }

    /* Then check if the participant connection is active. */
    const connectionStatus = participant.connectionStatus || JitsiParticipantConnectionStatus.ACTIVE;

    if (connectionStatus !== JitsiParticipantConnectionStatus.ACTIVE) {
        return false;
    }

    /* Then check if audio-only mode is not active. */
    const audioOnly = state['features/base/audio-only'].enabled;

    if (!audioOnly) {
        return true;
    }

    /* Last, check if the participant is sharing their screen and they are on stage. */
    const remoteScreenShares = state['features/video-layout'].remoteScreenShares || [];
    const largeVideoParticipantId = state['features/large-video'].participantId;
    const participantIsInLargeVideoWithScreen
        = participant.id === largeVideoParticipantId && remoteScreenShares.includes(participant.id);

    return participantIsInLargeVideoWithScreen;
}

// BEGIN SALLY CUSTOM FUNCTIONS

export function getCustomRemoteParticipants(stateful: Object | Function, id: string) {
    const state = toState(stateful);
    const _currentLayout = getCurrentLayout(state);
   // let { remoteParticipants } = state['features/filmstrip'];

    const { remote } = state["features/base/participants"];

    let remoteParticipants = Array.from(remote.values()).filter((p) => !p.local);

    return remoteParticipants;
}

export function getCustomTrainers(stateful: Object | Function, id: string) {
    const state = toState(stateful);
    const { remote } = state["features/base/participants"];

    const trainers = Array.from(remote.values()).filter((p) => p?.name?.startsWith("Trainer"));
    const localParticipant = getLocalParticipant(state);
    if (localParticipant?.name.startsWith("Trainer")) {
        trainers.unshift(localParticipant);

    }

    return trainers;
}


// sally - custom functiont to get max remtoe participants based on tile/vertical view and client height
export function getMaxVisibleRemoteParticipants(stateful: Object | Function, id: string) {
    const state = toState(stateful);
    const _currentLayout = getCurrentLayout(state);
    const { clientHeight } = state['features/base/responsive-ui'];

        const tileViewActive = _currentLayout === LAYOUTS.TILE_VIEW;
        // tile view - max videos = 6 (icluding one local video)
        let maxVisibleRemoteParticipants = 5;

        // sally - set max viewable participants without srollbar
        if (!tileViewActive) {
        // sally - height minus toolbar (80) minus local video (120), divide by thumb height
           maxVisibleRemoteParticipants = Math.floor(((clientHeight - 200) / 120))
        };

    return maxVisibleRemoteParticipants;
}

export function getCntVisibileActiveSpeakers(stateful: Object | Function, id: string) {
    const state = toState(stateful);
    const _currentLayout = getCurrentLayout(state);
    let remoteParticipants = getCustomRemoteParticipants(state);
    const maxVisibleRemoteParticipants = getMaxVisibleRemoteParticipants(state);
    const tileViewActive = _currentLayout === LAYOUTS.TILE_VIEW;

    const cntTrainers = remoteParticipants.filter(
        (p) => p.name?.startsWith("Trainer")
    ).length;

    if (tileViewActive){
        return Math.min(remoteParticipants.length, maxVisibleRemoteParticipants) - cntTrainers
    } else {
        return Math.min(remoteParticipants.length - cntTrainers, maxVisibleRemoteParticipants)
    }
}

// sally = function to get order remote participants

export function getCustomOrderedRemoteParticipants(stateful: Object | Function, id: string) {
    const state = toState(stateful);
    const _currentLayout = getCurrentLayout(state);
   // let { remoteParticipants } = state['features/filmstrip'];

    //const { remote } = state["features/base/participants"];
    const recentActiveParticipants =
            state["features/base/participants/recentActive"];

    let remoteParticipants = getCustomRemoteParticipants(state);
    const maxVisibleRemoteParticipants = getMaxVisibleRemoteParticipants(state);

       // const localParticipant = getLocalParticipant(_participants);

        const tileViewActive = _currentLayout === LAYOUTS.TILE_VIEW;

        // sally - no trainer in left side
        if (!tileViewActive) {
            remoteParticipants = remoteParticipants.filter(
                (p) => !p.name?.startsWith("Trainer") && !p.local
            );
        }


        const tracks = state["features/base/tracks"];
        //sally order participants
        remoteParticipants = remoteParticipants.map((p) => {
            if (p.name?.startsWith("Trainer")) {
                p.order = 1;
                return p;
            }
            // const isLocal = p?.local ?? true;
            // if (isLocal) {
            //     p.order = 200;
            //     return p;
            // }
            const recentParticipantIndex = recentActiveParticipants.findIndex(
                (part) => part.id === p.id
            );
            if (p?.connectionStatus !== "active") {
                p.order = 100 + recentParticipantIndex;
                return p;
            }
            const isRemoteParticipant = !p?.isFakeParticipant && !p?.local;
            const participantID = p.id;
            const _videoTrack = getTrackByMediaTypeAndParticipant(
                tracks,
                MEDIA_TYPE.VIDEO,
                participantID
            );
            const videoStreamMuted = _videoTrack
                ? _videoTrack.muted
                : "no stream";
            const isScreenSharing = _videoTrack?.videoType === "desktop";
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
                remoteParticipants.length > maxVisibleRemoteParticipants
            ) {
                let i = remoteParticipants.findIndex((p) => p?.dominantSpeaker);

                if (i !== -1 && i >= maxVisibleRemoteParticipants) {
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

        // Sally -  Add additional classes for trainer
        // if (_participant.name.startsWith('Trainer')) {
        //     className += ` trainer-participant`
        // } else {
        //     // add additional class for remote participants not sharing video
        //     // isCurrentlyOnLargeVideo: _isCurrentlyOnLargeVideo,
        //     // isHovered,
        //     // isAudioOnly: _isAudioOnly,
        //     // tileViewActive,
        //     // isVideoPlayable: _isVideoPlayable,
        //     // connectionStatus: _participant?.connectionStatus,
        //     // canPlayEventReceived,
        //     // videoStream: Boolean(_videoTrack),
        //     // isRemoteParticipant: !_participant?.isFakeParticipant && !_participant?.local,
        //     // isScreenSharing: _isScreenSharing,
        //     // videoStreamMuted: _videoTrack ? _videoTrack.muted : 'no stream'
        //     const dmInput = Thumbnail.getDisplayModeInput(this.props, this.state)
        //     if (isRemoteParticipant && (dmInput.isVideoPlayable && !dmInput.videoStreamMuted)) {
        //         className += ' has-video'
        //     } else if (isRemoteParticipant && _audioTrack && !_audioTrack.muted) {
        //         className += ' audio-only'
        //     }
        //     if ( isRemoteParticipant && dmInput.isScreenSharing) {
        //         className += ' sharing-screen'
        //     }
        //     if (_participant?.local) {
        //         className += ' local-participant'
        //     }


    remoteParticipants = remoteParticipants.map((p) => p.id).slice(0, maxVisibleRemoteParticipants)
    return remoteParticipants;
}

// sally = function to get all hidden remote participants

export function getHiddenRemoteParticipants(stateful: Object | Function, id: string) {
    const state = toState(stateful);
    const _currentLayout = getCurrentLayout(state);
   const remoteParticipants = getCustomRemoteParticipants(state);
   const orderedVisibleParticipants = getCustomOrderedRemoteParticipants(state);

   
   const hiddenparticipants = remoteParticipants.filter((p) => !orderedVisibleParticipants.includes(p.id)).map((p)=> p.id);

    return hiddenparticipants;
}

export function getIsLocalTrainer(stateful: Object | Function): boolean {
    const { name } = getLocalParticipant(stateful);
    return name?.startsWith("Trainer");
}


// END SALLY CUSTOM FUNCTIONS

/**
 * Resolves the first loadable avatar URL for a participant.
 *
 * @param {Object} participant - The participant to resolve avatars for.
 * @param {Store} store - Redux store.
 * @returns {?string}
 */
async function _getFirstLoadableAvatarUrl(participant, store) {
    for (let i = 0; i < AVATAR_CHECKER_FUNCTIONS.length; i++) {
        const url = AVATAR_CHECKER_FUNCTIONS[i](participant, store);

        if (url !== null) {
            if (AVATAR_CHECKED_URLS.has(url)) {
                const { isLoadable, isUsingCORS } = AVATAR_CHECKED_URLS.get(url) || {};

                if (isLoadable) {
                    return {
                        isUsingCORS,
                        src: url
                    };
                }
            } else {
                try {
                    const { corsAvatarURLs } = store.getState()['features/base/config'];
                    const { isUsingCORS, src } = await preloadImage(url, isCORSAvatarURL(url, corsAvatarURLs));

                    AVATAR_CHECKED_URLS.set(src, {
                        isLoadable: true,
                        isUsingCORS
                    });

                    return {
                        isUsingCORS,
                        src
                    };
                } catch (e) {
                    AVATAR_CHECKED_URLS.set(url, {
                        isLoadable: false,
                        isUsingCORS: false
                    });
                }
            }
        }
    }

    return undefined;
}

/**
 * Get the participants queue with raised hands.
 *
 * @param {(Function|Object)} stateful - The (whole) redux state, or redux's
 * {@code getState} function to be used to retrieve the state
 * features/base/participants.
 * @returns {Array<Object>}
 */
export function getRaiseHandsQueue(stateful: Object | Function): Array<Object> {
    const { raisedHandsQueue } = toState(stateful)['features/base/participants'];

    return raisedHandsQueue;
}

/**
 * Returns whether the given participant has his hand raised or not.
 *
 * @param {Object} participant - The participant.
 * @returns {boolean} - Whether participant has raise hand or not.
 */
export function hasRaisedHand(participant: Object): boolean {
    return Boolean(participant && participant.raisedHandTimestamp);
}
