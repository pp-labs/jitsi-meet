import { IStore } from '../app/types';
// eslint-disable-next-line lines-around-comment
// @ts-ignore
import { createVirtualBackgroundEffect } from '../stream-effects/virtual-background';

import { BACKGROUND_ENABLED, SET_VIRTUAL_BACKGROUND } from './actionTypes';
import logger from './logger';
import { VirtualBackgroundOptions } from './types';

/**
 * Signals the local participant activate the virtual background video or not.
 *
 * @param {Object} options - Represents the virtual background set options.
 * @param {Object} jitsiTrack - Represents the jitsi track that will have backgraund effect applied.
 * @returns {Promise}
 */
export function toggleBackgroundEffect(options: VirtualBackgroundOptions, jitsiTrack: any) {
    return async function(dispatch: IStore['dispatch'], getState: IStore['getState']) {
        await dispatch(backgroundEnabled(options.enabled));
        await dispatch(setVirtualBackground(options));
        const state = getState();
        const virtualBackground = state['features/virtual-background'];

        if (jitsiTrack) {
            try {
                if (options.enabled) {
                    await jitsiTrack.setEffect(await createVirtualBackgroundEffect(virtualBackground, dispatch));
                } else {
                    await jitsiTrack.setEffect(undefined);
                    dispatch(backgroundEnabled(false));
                }
            } catch (error) {
                dispatch(backgroundEnabled(false));
                logger.error('Error on apply background effect:', error);
            }
        }
    };
}

/**
 * Sets the selected virtual background image object.
 *
 * @param {Object} options - Represents the virtual background set options.
 * @returns {{
 *     type: SET_VIRTUAL_BACKGROUND,
 *     virtualSource: string,
 *     blurValue: number,
 *     type: string,
 * }}
 */
export function setVirtualBackground(options?: VirtualBackgroundOptions) {
    return {
        type: SET_VIRTUAL_BACKGROUND,
        virtualSource: options?.url,
        blurValue: options?.blurValue,
        backgroundType: options?.backgroundType,
        selectedThumbnail: options?.selectedThumbnail
    };
}

/**
 * Signals the local participant that the background effect has been enabled.
 *
 * @param {boolean} backgroundEffectEnabled - Indicate if virtual background effect is activated.
 * @returns {{
 *      type: BACKGROUND_ENABLED,
 *      backgroundEffectEnabled: boolean
 * }}
 */
export function backgroundEnabled(backgroundEffectEnabled: boolean) {
    return {
        type: BACKGROUND_ENABLED,
        backgroundEffectEnabled
    };
}
