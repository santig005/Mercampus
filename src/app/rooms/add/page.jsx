"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddRoomPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: "",
    price: "",
    thumbnail: "",
    description: "",
    privateBath: false,
    roomsNumber: 1,
    parking: false,
    elevator: false,
    neighborhood: "",
    address: "",
    estrato: 3,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // En un flujo real, obtendríamos el ID del Landlord a través de la sesión del usuario.
      // Por ahora, lo dejamos como un placeholder.
      const landlordId = "60d0fe4f5311236168a109cc"; // Placeholder Landlord ObjectId

      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, landlord: landlordId }),
      });

      if (res.ok) {
        alert("Habitación añadida con éxito!");
        router.push("/landlords");
      } else {
        const error = await res.json();
        alert(`Error al añadir habitación: ${error.error}`);
      }
    } catch (error) {
      console.error("Failed to add room", error);
      alert("Ocurrió un error en el servidor.");
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', maxWidth: '500px', margin: 'auto' }}>
      <h1>Añadir Nueva Habitación</h1>
      
      <label>Título</label>
      <input name="title" value={formData.title} onChange={handleChange} required />
      
      <label>Precio (COP)</label>
      <input name="price" type="number" value={formData.price} onChange={handleChange} required />
      
      <label>URL de Miniatura</label>
      <input name="thumbnail" value={formData.thumbnail} onChange={handleChange} />
      
      <label>Descripción</label>
      <textarea name="description" value={formData.description} onChange={handleChange} required />
      
      <label>Barrio</label>
      <input name="neighborhood" value={formData.neighborhood} onChange={handleChange} required />
      
      <label>Dirección</label>
      <input name="address" value={formData.address} onChange={handleChange} required />
      
      <label>Estrato</label>
      <input name="estrato" type="number" min="1" max="6" value={formData.estrato} onChange={handleChange} required />
      
      <label>Número de Cuartos</label>
      <input name="roomsNumber" type="number" min="1" value={formData.roomsNumber} onChange={handleChange} />
      
      <div>
        <input name="privateBath" type="checkbox" checked={formData.privateBath} onChange={handleChange} />
        <label>Baño Privado</label>
      </div>
      
      <div>
        <input name="parking" type="checkbox" checked={formData.parking} onChange={handleChange} />
        <label>Parqueadero</label>
      </div>
      
      <div>
        <input name="elevator" type="checkbox" checked={formData.elevator} onChange={handleChange} />
        <label>Ascensor</label>
      </div>
      
      <button type="submit" style={{ marginTop: '20px' }}>Añadir Habitación</button>
    </form>
  );
}
