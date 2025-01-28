import {getUser} from '@/services/auth/server/user';
import {Seller} from '@/utils/models/sellerschema';

export async function isSeller() {
  const user=await getSeller();
  if(user){
    return true;
  }
  return false;
}

export async function getSeller() {
  const user=await getUser();
  if(user){
    const seller=await Seller.findOne({userId:user._id});
    return seller;
  }

  return false;
}