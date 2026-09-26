'use client';
import SellerGrid from '@/components/seller/index/SellerGrid';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

// T-81 (seller profile zone): moved from src/app/antojos/sellers/list/page.jsx
// (deleted) - '/antojos/sellers/list' is a `static` LOCALIZED_ROUTES entry
// (src/i18n/routing.ts), exact path only, same treatment as the listing
// zone's own index pages. It nests under the existing (already-duplicated)
// src/app/[locale]/antojos/layout.jsx, so no new layout was needed.
//
// The /100 forces Tailwind to emit the theme's real colour
// (oklch(var(--p)/1)) instead of the bare bg-primary class, which
// public/css/main.css redefines to a fixed white (#f8f8f8) - see the note in
// Layout.jsx.
const ACTIVE_SECTION_CLASSES = 'bg-primary/100 text-primary-content shadow-md';
const INACTIVE_SECTION_CLASSES = 'text-base-content hover:bg-base-200';

function Sellers() {
  const [selectedSection, setSelectedSection] = useState('antojos');
  const t = useTranslations('SellerList');

  const handleSectionChange = (section) => {
    setSelectedSection(section);
  };

  return (
    <div className='p-2'>
      <h2 className='text-2xl font-bold text-center text-white bg-gradient-to-r from-red-500 to-[#FF7622] py-4 px-6 rounded-lg shadow-lg hover:scale-105 transition-transform duration-300 mt-4 mb-8'>
        {selectedSection === 'antojos' ? (
          <>{t('headingAntojosLead')} <span className='text-yellow-300'>{t('headingAntojosHighlight')}</span> {t('headingAntojosTail')}</>
        ) : (
          <>{t('headingMarketplaceLead')} <span className='text-yellow-300'>{t('headingMarketplaceHighlight')}</span> {t('headingMarketplaceTail')}</>
        )}
      </h2>

      {/* Section selector */}
      <div className='flex justify-center mb-6'>
        <div className='bg-base-100 rounded-lg p-1 shadow-md'>
          <button
            onClick={() => handleSectionChange('antojos')}
            className={`px-6 py-2 rounded-md transition-all duration-200 ${
              selectedSection === 'antojos'
                ? ACTIVE_SECTION_CLASSES
                : INACTIVE_SECTION_CLASSES
            }`}
          >
            {t('antojosTab')}
          </button>
          <button
            onClick={() => handleSectionChange('marketplace')}
            className={`px-6 py-2 rounded-md transition-all duration-200 ${
              selectedSection === 'marketplace'
                ? ACTIVE_SECTION_CLASSES
                : INACTIVE_SECTION_CLASSES
            }`}
          >
            {t('marketplaceTab')}
          </button>
        </div>
      </div>

      <SellerGrid section={selectedSection} />
    </div>
  );
}

export default Sellers;
