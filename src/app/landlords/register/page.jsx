"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterLandlordPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    photo: "",
    description: "",
    phoneNumber: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/landlords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          // Placeholder for user ID from session
          user: "60d0fe4f5311236168a109cb", // Example ObjectId
        }),
      });

      if (res.ok) {
        alert("¡Registro de arrendador exitoso!");
        router.push("/landlords");
      } else {
        const error = await res.json();
        alert(`Error al registrar: ${error.error}`);
      }
    } catch (error) {
      console.error("Failed to register landlord", error);
      alert("Ocurrió un error en el servidor.");
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', maxWidth: '400px', margin: 'auto' }}>
      <h1>Registro de Arrendador</h1>
      <label>URL de la Foto</label>
      <input name="photo" value={formData.photo} onChange={handleChange} placeholder="https://example.com/photo.jpg" />
      
      <label>Descripción</label>
      <textarea name="description" value={formData.description} onChange={handleChange} required />

      <label>Teléfono</label>
      <input name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} required />
      
      <button type="submit" style={{ marginTop: '20px' }}>Registrarse</button>
    </form>
  );
}
