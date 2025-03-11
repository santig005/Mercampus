import Script from 'next/script';
import React from 'react'

const AdSense = () => {
    const pId = process.env.NEXT_PUBLIC_ADS_ID;
    return (
        <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-${pId}`}
            crossOrigin='anonymous'
            strategy='lazyOnload'
        />
    )
}

export default AdSense