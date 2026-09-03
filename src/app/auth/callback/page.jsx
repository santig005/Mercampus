import { logger } from '@/lib/logger';
import { AuthenticateWithRedirectCallback } from '@clerk/nextjs';

export default function SSOCallback() {
  logger.debug('testing');
  // Handle the redirect flow by rendering the
  // prebuilt AuthenticateWithRedirectCallback component.
  // This is the final step in the custom OAuth flow.
  // Send the user an email with the verification code
  return <AuthenticateWithRedirectCallback verifyEmailAddressUrl='/' />;
}
