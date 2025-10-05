'use client';
import React, { useState, useCallback } from 'react';
import TutorModal from './TutorModal';

export default function TutorModalHandler({ children }) {
  const [selectedTutor, setSelectedTutor] = useState(null);

  const showModal = useCallback(tutor => {
    setSelectedTutor(tutor);
  }, []);

  const hideModal = useCallback(() => {
    setSelectedTutor(null);
  }, []);

  return (
    <>
      {children(showModal)}
      {selectedTutor && (
        <TutorModal tutor={selectedTutor} onClose={hideModal} />
      )}
    </>
  );
}
