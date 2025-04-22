// utils/lib/auth.js
import { Product } from "@/utils/models/productSchema";
import { getUserWithSellerByEmail } from "@/services/server/userService"; // <-- tu helper
import { AppError } from "@/utils/lib/errors";
import { auth, clerkClient } from "@clerk/nextjs/server";

/**
 * Obtiene email a partir de token de clerk 
 */
async function getEmailFromToken() {
  const { userId } = auth();
  console.log("userId", userId);
  
  if (!userId) {
    throw new AppError("No autenticado.", 401);
  }
  const client=clerkClient();
  try{
    const token = clerkClient().auth.getToken();
    console.log("el token es", token);
  }
  catch (error) {
    console.log("Error al obtener el token de Clerk:", error);
  }
  
  const user = await client.users.getUser(userId);
  const email = user.emailAddresses?.[0]?.emailAddress;
  if (!email) {
    throw new AppError("No se encontró email en Clerk.", 500);
  }
  return email;
}
/**
 * Verifica que el usuario autenticado sea el vendedor propietario
 * del producto dado, y devuelve el sellerId.
 */
export const verifyOwnershipAndGetSellerId = async (productId) => {
  const email = await getEmailFromToken();
  const { user:dbUser, seller, error } = await getUserWithSellerByEmail(email);
  if (error) {
    throw { status: 500, message: "Error interno obteniendo datos de usuario." };
  }
  if(!dbUser){
    throw { status: 403, message: "No eres usuario registrado." };
  }
  if (!seller) {
    throw { status: 403, message: "No eres vendedor registrado." };
  }

  // 4) cargar solo el campo sellerId del producto
  const product = await Product.findById(productId)
    .select("sellerId")
    .lean();
  if (!product) {
    throw { status: 404, message: "Producto no encontrado." };
  }

  // 5) comparar que el sellerId del producto coincide con el seller del usuario
  const prodSellerId = product.sellerId?.toString();
  if (prodSellerId !== seller._id.toString()) {
    throw {
      status: 403,
      message: "No tienes permiso para modificar este producto.",
    };
  }

  return prodSellerId;
};

/**
 * Verifica si el usuario autenticado (o admin) puede acceder
 * al seller con _id = sellerId. Devuelve { user, seller } si OK.
 */
export const verifySellerId = async (sellerId) => {
  const email = await getEmailFromToken();
  const { user, seller, error } = await getUserWithSellerByEmail(email);
  if (error) {
    throw new AppError("Error interno obteniendo datos de usuario.", 500);
  }

  if (!user) {
    throw new AppError("Usuario no encontrado.", 403);
  }

  if (!seller) {
    throw new AppError("Vendedor no encontrado.", 403);
  }

  const isAdmin = user.role === "admin";
  const isOwner = seller?._id.toString() === sellerId;

  if (!isAdmin && !isOwner) {
    throw new AppError("No autorizado para este vendedor.", 403);
  }

  return { user, seller };
};
export const verifySellerEmail = async (sellerEmail) => {
  const email = await getEmailFromToken();
  if (email !== sellerEmail) {
    throw new AppError("No tienes permiso para modificar este vendedor.", 403);
  }
};