'use client';
import Schedule from '@/components/seller/Schedule';

// T-81 (seller profile/schedule zone): moved from
// src/app/antojos/sellers/schedules/ (deleted). Still a Client Component -
// no `params`; src/app/[locale]/layout.jsx already calls setRequestLocale
// for the whole subtree.
const ScheduleRegister = () => {
  return (
    <div>
      <Schedule />
    </div>
  );
};

export default ScheduleRegister;
