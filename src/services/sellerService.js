"use server";

import { fetchAPI } from "./api";
import { auth } from "@clerk/nextjs/server";

export const getSellers = async () => {
  const { getToken } = await auth();
  const options = {
    Authorization: `Bearer ${getToken()}`,
  };
  return await fetchAPI("/sellers");
};

export const getSellerById = async (id) => {
  return await fetchAPI(`/sellers/${id}`);
};

export const createSeller = async (seller) => {
  return await fetchAPI("/sellers", {
    method: "POST",
    body: JSON.stringify(seller),
  });
};
