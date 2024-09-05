import { Inter } from "next/font/google";
import Navbar from "@/components/Navbar";
import {Providers} from './Providers';

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Mercampus",
  description: "Calma tus antojos con Mercampus, un marketplace para universitarios donde podrás comprar y vender tus artículos.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <Providers>
          <Navbar />
          {children}
          </Providers>
      <footer>
        <p>© 2024 Mercampus. Todos los derechos reservados.</p>
      </footer>
      </body>
    </html>
  );
}
