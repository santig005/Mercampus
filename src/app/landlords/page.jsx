"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

// Componente simple para mostrar información de la habitación
const RoomCard = ({ room }) => (
  <div style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '16px', margin: '8px', maxWidth: '300px' }}>
    <img src={room.thumbnail || '/images/default-pfp.png'} alt={room.title} style={{ width: '100%', height: '150px', objectFit: 'cover' }} />
    <h3>{room.title}</h3>
    <p><strong>Precio:</strong> ${room.price.toLocaleString()}</p>
    <p><strong>Barrio:</strong> {room.neighborhood}</p>
    <p><strong>Estrato:</strong> {room.estrato}</p>
    <p>{room.description}</p>
    <hr />
    <h4>Arrendador</h4>
    <p>{room.landlord.user?.name || 'No disponible'}</p>
    <a href={`tel:${room.landlord.phoneNumber}`}>Contactar</a>
  </div>
);

export default function RoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const res = await fetch("/api/rooms");
        const data = await res.json();
        setRooms(data);
      } catch (error) {
        console.error("Failed to fetch rooms", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRooms();
  }, []);

  if (loading) {
    return <div>Cargando habitaciones...</div>;
  }

  return (
    <div>
      <h1>Habitaciones Disponibles</h1>
      <Link href="/landlords/register">
        <button style={{ margin: '10px 0', marginRight: '10px' }}>Conviértete en Arrendador</button>
      </Link>
      <Link href="/rooms/add">
        <button style={{ margin: '10px 0' }}>Publica una Habitación</button>
      </Link>
      <div style={{ display: 'flex', flexWrap: 'wrap' }}>
        {rooms.length > 0 ? (
          rooms.map((room) => <RoomCard key={room._id} room={room} />)
        ) : (
          <p>No hay habitaciones disponibles en este momento.</p>
        )}
      </div>
    </div>
  );
}
