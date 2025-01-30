const ALLOWED_IPS = [
    '127.0.0.1',
    '13.35.238.3', // cron-job.org
    '13.35.238.67',
    '13.35.238.69',
    '13.35.238.99',
    '216.198.79.193', // mercampus.vercel.app
    '64.29.17.193',
    '84.32.84.32', // mercampus.com

  ];
  
  export const allowed_ips = async () => {
    return ALLOWED_IPS;
  };