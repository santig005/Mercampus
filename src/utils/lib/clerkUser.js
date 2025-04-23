import { clerkClient } from "@clerk/clerk-sdk-node";


/**
 * Dada una petición Next.js, extrae el token (cookie o header)
 * y devuelve { userId, email } o lanza un error.
 */
export async function getUserFromToken(req) {
  console.log("🔔 getUserFromToken arrancó");
  console.log("Headers completos:");
  console.log(req.headers);

  // 1) Intento extraer token del header Authorization
  const authHeader = req.headers.get("authorization") || "";
  console.log("authHeader:");
  console.log(authHeader);

  let token = null;
  if (authHeader.startsWith("Bearer ")) {
    token = authHeader.slice(7);
    console.log("Token obtenido del header:");
    console.log(token);
  } else {
    /* console.log("No había Bearer en header, miro la cookie __session...");
    const cookieHeader = req.headers.get("cookie") || "";
    console.log("cookieHeader:");
    console.log(cookieHeader);

    const maybeCookie = cookieHeader
      .split(";")
      .map(c => c.trim())
      .find(c => c.startsWith("__session="));
    console.log("maybeCookie:");
    console.log(maybeCookie);

    if (maybeCookie) {
      const [, val] = maybeCookie.split("=");
      token = decodeURIComponent(val);
      console.log("Token obtenido de __session cookie:");
      console.log(token);
    } */
   // Intento 2: Headers especiales de Vercel (producción)
   const vercelHeaders = req.headers.get("x-vercel-sc-headers");
   if (vercelHeaders) {
     try {
       const parsedVercelHeaders = JSON.parse(vercelHeaders);
       if (parsedVercelHeaders.Authorization?.startsWith("Bearer ")) {
         token = parsedVercelHeaders.Authorization.slice(7);
         console.log("Token obtenido de x-vercel-sc-headers");
       }
     } catch (error) {
       console.error("Error parseando x-vercel-sc-headers:", error);
     }
   }
   
   // Intento 3: Cookie __session (solo si no se encontró en headers)
   if (!token) {
     const cookieHeader = req.headers.get("cookie") || "";
     const maybeCookie = cookieHeader
       .split(";")
       .find(c => c.trim().startsWith("__session="));
     
     if (maybeCookie) {
       const [, val] = maybeCookie.split("=");
       token = decodeURIComponent(val);
       console.log("Token obtenido de __session cookie");
     }
   }
  }

  if (!token) {
    console.log("🚫 No se encontró token en header ni cookie");
    const err = new Error("No autenticado");
    err.status = 401;
    throw err;
  }

  // 2) Verificar token localmente con Clerk
  console.log("🔑 Verificando token con Clerk...");
  let payload;
  try {
    const result = await clerkClient.verifyToken(token, { type: 'session' });
    payload = result;
    console.log("🛂 Token verificado localmente con Clerk");
    console.log("result es un objeto:");
    console.log(result);
    console.log("✅ Token verificado con éxito:");
    console.log(payload);
    if (!payload?.sub) { // Validación adicional
      console.log("Payload no contiene sub (userId)");
    }

  } catch (jwtErr) {
    console.log("❌ Error verificando token:");
    console.log(jwtErr);
    const err = new Error("Token inválido o expirado");
    err.status = 401;
    throw err;
  }

  // 3) Extraer userId
  const userId = payload.sub;
  console.log("userId extraído del payload:");
  console.log(userId);
  if (!userId) {
    console.log("🚫 Payload no contenía campo sub (userId)");
    const err = new Error("Token inválido (sin sub)");
    err.status = 401;
    throw err;
  }

  // 4) Obtener email desde Clerk
  console.log("🔍 Llamando a Clerk para fetch del usuario completo...");
  const user = await clerkClient.users.getUser(userId);
  console.log("User completo de Clerk:");
  console.log(user);

  const email = user.emailAddresses?.[0]?.emailAddress;
  console.log("Email extraído de user:");
  console.log(email);

  if (!email) {
    console.log("🚫 No se encontró ninguna dirección de email en Clerk user");
    const err = new Error("Email no encontrado en Clerk");
    err.status = 500;
    throw err;
  }

  console.log("✅ getUserFromToken finalizó con éxito");
  return { userId, email };
}
