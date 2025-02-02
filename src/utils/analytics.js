import { GoogleAnalytics, GoogleTagManager } from '@next/third-parties/google';

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;

export default function Analytics() {
    return (
        <>
        <GoogleAnalytics gaId={GA_ID} />
        <GoogleTagManager gtmId={GTM_ID} />
        </>
    );
}