"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
// Simple card component for displaying tutor info
const TutorCard = ({ tutor }) => (
  <div style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '16px', margin: '8px' }}>
    <img src={tutor.photo || '/images/default-pfp.png'} alt={tutor.user?.name} style={{ width: '100px', height: '100px', borderRadius: '50%' }} />
    <h3>{tutor.user?.name || 'Nombre no disponible'}</h3>
    <p><strong>Universidad:</strong> {tutor.university}</p>
    <p><strong>Materias:</strong> {tutor.subjects.join(", ")}</p>
    <p>{tutor.description}</p>
    <a href={`tel:${tutor.phoneNumber}`}>Llamar</a>
  </div>
);
export default function TutorsPage() {
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchTutors = async () => {
      try {
        const res = await fetch("/api/tutors");
        const data = await res.json();
        setTutors(data);
      } catch (error) {
        console.error("Failed to fetch tutors", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTutors();
  }, []);
  if (loading) {
    return <div>Cargando tutores...</div>;
  }
  return (
    <div>
      <h1>Tutores Disponibles</h1>
      <Link href="/tutors/register">
        <button style={{ margin: '10px 0' }}>Conviértete en Tutor</button>
      </Link>
      <div style={{ display: 'flex', flexWrap: 'wrap' }}>
        {tutors.length > 0 ? (
          tutors.map((tutor) => <TutorCard key={tutor._id} tutor={tutor} />)
        ) : (
          <p>No hay tutores disponibles en este momento.</p>
        )}
      </div>
    </div>
  );
}
