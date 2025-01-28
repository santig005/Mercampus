import {connectDB} from '@/utils/connectDB';
import { currentUser} from '@clerk/nextjs/server';
import { User } from '@/utils/models/userSchema';

async function isUser() {
  const user = await currentUser();
  return !!user;
}

async function getUser() {
  await connectDB();
  const user = await currentUser();
  if (user) {
    const email=user.emailAddresses[0].emailAddress;
    const dbUser =await User.findOne({email:email});
    if (dbUser) {
      return dbUser;
    }
  }
  return false;
}

async function getUserEmail() {
  const user = await currentUser();
  if (user) {
    try{
      const email = user.emailAddresses[0].emailAddress;
      return email;
    }
    catch(error){
      console.log(error);
    }
    return false;
  }
}

module.exports = { isUser, getUser, getUserEmail };