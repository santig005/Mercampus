import { Inter } from "next/font/google";
import "../../public/main.css";

import { UserProvider } from "@auth0/nextjs-auth0/client";
import Sidebar from "@/components/sidebar/Sidebar.jsx";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Mercampus",
  description:
    "Calma tus antojos con Mercampus, un marketplace para universitarios donde podrás comprar y vender tus artículos.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <UserProvider>
        <body className={inter.className + "container"}>
          <Sidebar >{children}</Sidebar>
        </body>
      </UserProvider>
    </html>
  );
}
