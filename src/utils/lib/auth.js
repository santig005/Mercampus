import { currentUser } from '@clerk/nextjs/server';
import { Seller } from '@/utils/models/sellerSchema2';
import { User } from '@/utils/models/userSchema'; // Asegúrate que exista y esté bien definido
import { Product } from '@/utils/models/productSchema'; // Necesitamos Product aquí
import { connectDB } from '@/utils/connectDB';
import mongoose from 'mongoose';

/**
 * Verifica si el usuario actual autenticado (vía Clerk) es el propietario
 * del producto especificado. Usa una consulta principal a Product con nested populate.
 * Devuelve el _id del vendedor propietario si la verificación es exitosa.
 * Lanza errores con status 401, 403, o 404 en caso contrario.
 */
export const verifyOwnershipAndGetSellerId = async (productId) => {
  try {
    await connectDB();

    // 1. Validar formato del ID del producto
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw { status: 400, message: 'ID de producto inválido.' };
    }

    // 2. Obtener usuario actual de Clerk
    const clerkUser = await currentUser();
    if (!clerkUser) {
      throw { status: 401, message: 'No autenticado (Clerk).' };
    }
    // Asegúrate que el usuario tenga email
     if (!clerkUser.emailAddresses || clerkUser.emailAddresses.length === 0) {
        throw { status: 400, message: 'Usuario Clerk no tiene email.' };
    }
    const userEmail = clerkUser.emailAddresses[0].emailAddress;
    console.log(`Verificando propiedad para producto ${productId} por usuario ${userEmail}`);

    // 3. Consulta ÚNICA a Product con nested populate
    const product = await Product.findById(productId)
      .select('sellerId') // Solo necesitamos el sellerId del producto inicialmente
      .populate({
        path: 'sellerId',    // Poblar el vendedor del producto
        model: 'Seller',     // Especificar modelo Seller
        select: '_id userId approved', // Seleccionar campos necesarios del Seller
        populate: {          // *** Nested Populate ***
          path: 'userId',    // Poblar el usuario DENTRO del vendedor
          model: 'User',     // Especificar modelo User
          match: { email: userEmail }, // *** ¡La Clave! Match con el email del usuario actual ***
          select: '_id email' // Solo necesitamos confirmar que el usuario existe y coincide
        }
      })
      .lean(); // Usar lean para mejor rendimiento

    // 4. Analizar el resultado del populate
    if (!product) {
      console.log(`Producto ${productId} no encontrado.`);
      throw { status: 404, message: 'Producto no encontrado.' };
    }

    // Verificar si el vendedor fue poblado (debería si el producto tiene un sellerId válido)
    if (!product.sellerId) {
        console.error(`Error: Producto ${productId} existe pero no tiene sellerId poblado. Revisar datos.`);
        // Esto podría indicar un problema de datos (sellerId inválido en el producto)
        throw { status: 500, message: 'Error de referencia interna del producto.' };
    }

    // *** ¡La Verificación Crucial! ***
    // Si product.sellerId.userId es null o undefined después del populate anidado,
    // significa que el vendedor del producto NO está asociado al email del usuario actual.
    if (!product.sellerId.userId) {
      console.log(`Usuario ${userEmail} NO es propietario del producto ${productId} (pertenece a seller ${product.sellerId._id}). Acceso denegado.`);
      throw { status: 403, message: 'No tienes permiso para modificar este producto.' };
    }

    // (Opcional) Verificar si el vendedor está aprobado, si aplica
    // if (!product.sellerId.approved) {
    //   console.log(`Vendedor ${product.sellerId._id} (usuario ${userEmail}) no está aprobado.`);
    //   throw { status: 403, message: 'Tu cuenta de vendedor no está aprobada.' };
    // }

    // 5. ¡Éxito! El usuario actual es el vendedor propietario
    console.log(`Usuario ${userEmail} confirmado como propietario (vendedor ${product.sellerId._id}) del producto ${productId}.`);
    return product.sellerId._id.toString(); // Devolvemos el ID del vendedor propietario

  } catch (error) {
    // Relanzar el error si ya tiene status, o crear uno genérico
    if (error.status) {
      throw error;
    } else {
      console.error("Error inesperado en verifyOwnershipAndGetSellerId:", error);
      throw { status: 500, message: 'Error interno al verificar la propiedad del producto.' };
    }
  }
};

export const verifySeller=async (sellerId) => {
  try{
    // 2. Obtener usuario actual de Clerk
    const clerkUser = await currentUser();
    if (!clerkUser) {
      throw { status: 401, message: 'No autenticado (Clerk).' };
    }
    // Asegúrate que el usuario tenga email
     if (!clerkUser.emailAddresses || clerkUser.emailAddresses.length === 0) {
        throw { status: 400, message: 'Usuario Clerk no tiene email.' };
    }
    const userEmail = clerkUser.emailAddresses[0].emailAddress;
    console.log(`Verificando propiedad para seller ${sellerId} por usuario ${userEmail}`);

    const seller = await Seller.findById(sellerId)
      .select('userId approved') // Solo necesitamos el userId y approved del vendedor inicialmente
      .populate({
        userId: 1, // Para obtener el userId del vendedor
        model: 'User', // Especificar modelo User
        match: { email: userEmail }, // *** ¡La Clave! Match con el email del usuario actual ***
        select: '_id email' // Solo necesitamos confirmar que el usuario existe y coincide
        })
        .lean(); // Usar lean para mejor rendimiento

        if (!seller) {
          console.log(`Vendedor ${sellerId} no encontrado.`);
          throw { status: 404, message: 'Vendedor no encontrado.' };
        }
        if (!seller.userId) {
          console.log(`Usuario ${userEmail} NO es propietario del vendedor ${sellerId}. Acceso denegado.`);
          throw { status: 403, message: 'No tienes permiso para modificar este vendedor.' };
        }

        // (Opcional) Verificar si el vendedor está aprobado, si aplica
        if (!seller.approved) {
          console.log(`Vendedor ${sellerId} (usuario ${userEmail}) no está aprobado.`);
          throw { status: 403, message: 'Tu cuenta de vendedor no está aprobada.' };
        }
        return seller.userId;

  } catch (error) {
    console.error("Error inesperado en verifySeller:", error);  
  }
  }