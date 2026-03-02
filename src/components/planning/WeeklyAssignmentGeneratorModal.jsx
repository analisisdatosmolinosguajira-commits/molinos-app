import React from 'react';
import WeeklyPlannerView from './WeeklyPlannerView';

/**
 * WeeklyAssignmentGeneratorModal
 * 
 * This is now a thin wrapper around the new WeeklyPlannerView.
 * Maintains the same API (isOpen, onClose, onSuccess) for backwards compatibility.
 */
const WeeklyAssignmentGeneratorModal = ({ isOpen, onClose, onSuccess }) => {
    return (
        <WeeklyPlannerView
            isOpen={isOpen}
            onClose={onClose}
            onSuccess={onSuccess}
        />
    );
};

export default WeeklyAssignmentGeneratorModal;
