// @flow

import { getGravatarURL } from '@jitsi/js-utils/avatar';
import type { Store } from 'redux';

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

declare var interfaceConfig: Object;

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
                = store.getState()['features/base/config'].gravatarBaseURL ?? 'https://www.gravatar.com/avatar/';

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
        .then(src => {

            if (AVATAR_QUEUE.length) {
                const next = AVATAR_QUEUE.shift();

                next.resolve();
            }

            return src;
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
 * FIXME: Remove the hardcoded strings once interfaceConfig is stored in redux
 * and merge with a similarly named method in {@code conference.js}.
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

    if (participant) {
        if (participant.name) {
            return participant.name;
        }

        if (participant.local) {
            return typeof interfaceConfig === 'object'
                ? interfaceConfig.DEFAULT_LOCAL_DISPLAY_NAME
                : 'me';
        }
    }

    return typeof interfaceConfig === 'object'
        ? interfaceConfig.DEFAULT_REMOTE_DISPLAY_NAME
        : 'Fellow Jitster';
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

// sally = function to get ordere remote participants

export function getCustomOrderedRemoteParticipants(stateful: Object | Function, id: string) {
    const state = toState(stateful);
    const _currentLayout = getCurrentLayout(state);
   // let { remoteParticipants } = state['features/filmstrip'];

    const { remote } = state["features/base/participants"];
    const recentActiveParticipants =
            state["features/base/participants/recentActive"];


   console.log(Array.from(remote.values()))

   console.log('here')
   console.log(recentActiveParticipants)

    let remoteParticipants = Array.from(remote.values()).filter((p) => !p.local);
    console.log(remoteParticipants)

       // const localParticipant = getLocalParticipant(_participants);

        const tileViewActive = _currentLayout === LAYOUTS.TILE_VIEW;
        let maxVisableRemoteParticipants = 5;

        // sally - no trainer in left side
        if (!tileViewActive) {
            remoteParticipants = remoteParticipants.filter(
                (p) => !p.name?.startsWith("Trainer") && !p.local
            );
            // sally - height minus toolbar (80) minus local video (120), divide by thumb height
           // maxVisableRemoteParticipants = Math.floor(((_clientHeight - 200) / 120))
        } else {
            maxVisableRemoteParticipants = 5;
        }


        const tracks = state["features/base/tracks"];
        //sally order participants
        remoteParticipants = remoteParticipants.map((p) => {
            if (p.name?.startsWith("Trainer")) {
                p.order = 1;
                return p;
            }
            const isLocal = p?.local ?? true;
            if (isLocal) {
                p.order = 200;
                return p;
            }
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
                remoteParticipants.length > maxVisableRemoteParticipants
            ) {
                let i = remoteParticipants.findIndex((p) => p?.dominantSpeaker);

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

        const trainers = remoteParticipants.filter(
            (p) => p.name?.startsWith("Trainer")
        );


    remoteParticipants = remoteParticipants.map((p) => p.id)
    return remoteParticipants;
}

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
                if (AVATAR_CHECKED_URLS.get(url)) {
                    return url;
                }
            } else {
                try {
                    const finalUrl = await preloadImage(url);

                    AVATAR_CHECKED_URLS.set(finalUrl, true);

                    return finalUrl;
                } catch (e) {
                    AVATAR_CHECKED_URLS.set(url, false);
                }
            }
        }
    }

    return undefined;
}

/**
 * Selector for retrieving ids of participants in the order that they are displayed in the filmstrip (with the
 * exception of participants with raised hand). The participants are reordered as follows.
 * 1. Local participant.
 * 2. Participants with raised hand.
 * 3. Participants with screenshare sorted alphabetically by their display name.
 * 4. Shared video participants.
 * 5. Recent speakers sorted alphabetically by their display name.
 * 6. Rest of the participants sorted alphabetically by their display name.
 *
 * @param {(Function|Object)} stateful - The (whole) redux state, or redux's
 * {@code getState} function to be used to retrieve the state features/base/participants.
 * @returns {Array<string>}
 */
export function getSortedParticipantIds(stateful: Object | Function): Array<string> {
    const { id } = getLocalParticipant(stateful);
    const remoteParticipants = getRemoteParticipantsSorted(stateful);
    const reorderedParticipants = new Set(remoteParticipants);
    const raisedHandParticipants = getRaiseHandsQueue(stateful);
    const remoteRaisedHandParticipants = new Set(raisedHandParticipants || []);

    for (const participant of remoteRaisedHandParticipants.keys()) {
        // Avoid duplicates.
        if (reorderedParticipants.has(participant)) {
            reorderedParticipants.delete(participant);
        } else {
            remoteRaisedHandParticipants.delete(participant);
        }
    }

    // Remove self.
    remoteRaisedHandParticipants.has(id) && remoteRaisedHandParticipants.delete(id);

    // Move self and participants with raised hand to the top of the list.
    return [
        id,
        ...Array.from(remoteRaisedHandParticipants.keys()),
        ...Array.from(reorderedParticipants.keys())
    ];
}

/**
 * Get the participants queue with raised hands.
 *
 * @param {(Function|Object)} stateful - The (whole) redux state, or redux's
 * {@code getState} function to be used to retrieve the state
 * features/base/participants.
 * @returns {Array<string>}
 */
export function getRaiseHandsQueue(stateful: Object | Function): Array<string> {
    const { raisedHandsQueue } = toState(stateful)['features/base/participants'];

    return raisedHandsQueue;
}
