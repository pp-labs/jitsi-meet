/* eslint-disable lines-around-comment */
import Spinner from '@atlaskit/spinner';
import { Theme } from '@mui/material';
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { makeStyles } from 'tss-react/mui';

// @ts-ignore
import { Dialog, hideDialog } from '../../../base/dialog';
import Icon from '../../../base/icons/components/Icon';
import { IconSearch } from '../../../base/icons/svg';
// @ts-ignore
import { getFieldValue } from '../../../base/react';
import { withPixelLineHeight } from '../../../base/styles/functions.web';
import { NOTES_MAX_LENGTH } from '../../constants';
// @ts-ignore
import { useSalesforceLinkDialog } from '../../useSalesforceLinkDialog';

import { RecordItem } from './RecordItem';

// @ts-ignore
const useStyles = makeStyles()((theme: Theme) => {
    return {
        container: {
            minHeight: '450px',
            overflowY: 'auto',
            position: 'relative'
        },
        recordsSearchContainer: {
            position: 'relative',
            padding: '1px'
        },
        searchIcon: {
            display: 'block',
            position: 'absolute',
            color: theme.palette.text03,
            left: 16,
            top: 10,
            width: 20,
            height: 20
        },
        resultLabel: {
            fontSize: '15px',
            margin: '16px 0 8px'
        },
        recordsSearch: {
            backgroundColor: theme.palette.field01,
            border: '1px solid',
            borderRadius: theme.shape.borderRadius,
            borderColor: theme.palette.ui05,
            color: theme.palette.text01,
            padding: '10px 16px 10px 44px',
            width: '100%',
            height: 40,
            '&::placeholder': {
                color: theme.palette.text03,
                ...withPixelLineHeight(theme.typography.bodyShortRegular)
            }
        },
        spinner: {
            alignItems: 'center',
            display: 'flex',
            height: 'calc(100% - 100px)',
            justifyContent: 'center',
            width: '100%'
        },
        noRecords: {
            height: 'calc(100% - 150px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column'
        },
        recordsError: {
            height: 'calc(100% - 80px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column'
        },
        recordList: {
            listStyle: 'none',
            margin: '10px 0',
            padding: 0
        },
        recordInfo: {
            backgroundColor: theme.palette.ui03,
            padding: '0 16px',
            borderRadius: theme.shape.borderRadius,
            marginBottom: '28px'
        },
        detailsError: {
            padding: '10px 0'
        },
        addNote: {
            padding: '10px 0'
        },
        notes: {
            lineHeight: '18px',
            minHeight: '130px',
            resize: 'vertical',
            width: '100%',
            boxSizing: 'borderBox',
            overflow: 'hidden',
            border: '1px solid',
            borderColor: theme.palette.ui05,
            backgroundColor: theme.palette.field01,
            // @ts-ignore
            color: theme.palette.field02,
            borderRadius: theme.shape.borderRadius,
            padding: '10px 16px'
        }
    };
});


/**
 * Component that renders the Salesforce link dialog.
 *
 * @returns {React$Element<any>}
 */
function SalesforceLinkDialog() {
    const { t } = useTranslation();
    const { classes, theme } = useStyles();
    const dispatch = useDispatch();
    const {
        hasDetailsErrors,
        hasRecordsErrors,
        isLoading,
        linkMeeting,
        notes,
        records,
        searchTerm,
        selectedRecord,
        selectedRecordOwner,
        setNotes,
        setSearchTerm,
        setSelectedRecord,
        showNoResults,
        showSearchResults
    } = useSalesforceLinkDialog();

    const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const value = getFieldValue(event);

        setSearchTerm(value);
    }, [ getFieldValue ]);

    const handleSubmit = useCallback(() => {
        dispatch(hideDialog());
        linkMeeting();
    }, [ hideDialog, linkMeeting ]);

    const renderSpinner = () => (
        <div className = { classes.spinner }>
            <Spinner
                // @ts-ignore
                isCompleting = { false }
                size = 'medium' />
        </div>
    );

    const renderDetailsErrors = () => (
        <div className = { classes.detailsError }>
            {t('dialog.searchResultsDetailsError')}
        </div>
    );

    const renderSelection = () => (
        <div>
            <div className = { classes.recordInfo }>
                <RecordItem { ...selectedRecord } />
                {selectedRecordOwner && <RecordItem { ...selectedRecordOwner } />}
                {hasDetailsErrors && renderDetailsErrors()}
            </div>
            <div className = { classes.addNote }>{t('dialog.addOptionalNote')}</div>
            <textarea
                autoFocus = { true }
                className = { classes.notes }
                maxLength = { NOTES_MAX_LENGTH }
                /* eslint-disable-next-line react/jsx-no-bind */
                onChange = { e => setNotes(e.target.value) }
                placeholder = { t('dialog.addMeetingNote') }
                rows = { 4 }
                value = { notes } />
        </div>
    );

    const renderRecordsSearch = () => !selectedRecord && (
        <div className = { classes.recordsSearchContainer }>
            <Icon
                className = { classes.searchIcon }
                color = { theme.palette.icon03 }
                src = { IconSearch } />
            <input
                autoComplete = 'off'
                autoFocus = { false }
                className = { classes.recordsSearch }
                name = 'recordsSearch'
                onChange = { handleChange }
                placeholder = { t('dialog.searchInSalesforce') }
                tabIndex = { 0 }
                value = { searchTerm } />
            {(!isLoading && !hasRecordsErrors) && (
                <div className = { classes.resultLabel }>
                    {showSearchResults
                        ? t('dialog.searchResults', { count: records.length })
                        : t('dialog.recentlyUsedObjects')
                    }
                </div>
            )}
        </div>
    );

    const renderNoRecords = () => showNoResults && (
        <div className = { classes.noRecords }>
            <div>{t('dialog.searchResultsNotFound')}</div>
            <div>{t('dialog.searchResultsTryAgain')}</div>
        </div>
    );

    const renderRecordsError = () => (
        <div className = { classes.recordsError }>
            {t('dialog.searchResultsError')}
        </div>
    );

    const renderContent = () => {
        if (isLoading) {
            return renderSpinner();
        }
        if (hasRecordsErrors) {
            return renderRecordsError();
        }
        if (showNoResults) {
            return renderNoRecords();
        }
        if (selectedRecord) {
            return renderSelection();
        }

        return (
            <ul className = { classes.recordList }>
                {records.map((item: any) => (
                    <RecordItem
                        key = { `record-${item.id}` }
                        /* eslint-disable-next-line react/jsx-no-bind */
                        onClick = { () => setSelectedRecord(item) }
                        { ...item } />
                ))}
            </ul>
        );
    };

    return (
        <Dialog
            disableEnter = { true }
            disableFooter = { !selectedRecord }
            height = { 'medium' }
            okDisabled = { !selectedRecord }
            okKey = 'dialog.linkMeeting'
            /* eslint-disable-next-line react/jsx-no-bind */
            onDecline = { () => setSelectedRecord(null) }
            onSubmit = { handleSubmit }
            titleKey = 'dialog.linkMeetingTitle'
            width = { 'small' }>
            <div className = { classes.container } >
                {renderRecordsSearch()}
                {renderContent()}
            </div>
        </Dialog>
    );
}

export default SalesforceLinkDialog;
