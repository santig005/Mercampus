"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { universities } from "@/utils/resources/universities";

export default function RegisterTutorPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    photo: "",
    university: universities[0] || "",
    subjects: "",
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
      const res = await fetch("/api/tutors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          subjects: formData.subjects.split(",").map(s => s.trim()),
          // En un caso real, el ID de usuario vendría de la sesión
          user: "60d0fe4f5311236168a109ca", // Placeholder
        }),
      });

      if (res.ok) {
        router.push("/tutors");
      } else {
        const error = await res.json();
        alert(`Error al registrar: ${error.error}`);
      }
    } catch (error) {
      console.error("Failed to register tutor", error);
      alert("Ocurrió un error en el servidor.");
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', maxWidth: '400px', margin: 'auto' }}>
      <h1>Registro de Tutor</h1>
      <label>URL de la Foto</label>
      <input name="photo" value={formData.photo} onChange={handleChange} placeholder="https://example.com/photo.jpg" />

      <label>Universidad</label>
      <select name="university" value={formData.university} onChange={handleChange}>
        {universities.map(uni => <option key={uni} value={uni}>{uni}</option>)}
      </select>
      
      <label>Materias (separadas por coma)</label>
      <input name="subjects" value={formData.subjects} onChange={handleChange} placeholder="Cálculo, Física, Programación" required />

      <label>Descripción</label>
      <textarea name="description" value={formData.description} onChange={handleChange} required />

      <label>Teléfono</label>
      <input name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} required />
      
      <button type="submit" style={{ marginTop: '20px' }}>Registrarse</button>
    </form>
  );
}
