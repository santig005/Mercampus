'use client';
import React, { useState } from 'react';
import InputFields from '@/components/auth/register/InputFields';
import { pqrsTypes } from '@/utils/resources/pqrs';
import { TbBrandWhatsapp } from 'react-icons/tb';
export default function PqrsForm() {
  const [pqrs, setPqrs] = useState({
    email: '',
    description: '',
    type: '',
  });
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const emailToSend = isAnonymous ? '' : pqrs.email;

    try {
      const response = await fetch('/api/pqrs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...pqrs, email: emailToSend }),
      });

      if (!response.ok) {
        throw new Error('Error al enviar la solicitud PQRS.');
      }
      setMessage({ type: 'success', text: 'Solicitud enviada correctamente.' });
      setPqrs({ email: '', description: '', type: '' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al enviar la solicitud PQRS.' });
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-8 bg-gray-100 rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold text-center mb-8">Formulario PQRS</h1>

      {message && (
        <div
          className={`mb-4 p-4 text-center rounded-lg ${
            message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="flex items-center mb-4">
          <label className="text-lg font-semibold mr-4">Anónimo</label>
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={() => setIsAnonymous(!isAnonymous)}
            className="w-6 h-6"
          />
        </div>

        {!isAnonymous && (
          <div>
            <InputFields
              title="Correo Electrónico"
              type="email"
              placeholder="Ingresa tu correo electrónico"
              value={pqrs.email}
              onChange={(e) => setPqrs({ ...pqrs, email: e.target.value })}
              name="email"
              required
            />
          </div>
        )}

        <div>
          <label className="block text-lg font-semibold mb-2">Tipo de Solicitud</label>
          <select
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={pqrs.type}
            onChange={(e) => setPqrs({ ...pqrs, type: e.target.value })}
            required
          >
            <option value="" disabled>
              Selecciona un tipo
            </option>
            {pqrsTypes.map((type, index) => (
              <option key={index} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div>
          <InputFields
            title="Descripción"
            type="text"
            placeholder="Escribe los detalles de tu solicitud"
            value={pqrs.description}
            onChange={(e) => setPqrs({ ...pqrs, description: e.target.value })}
            name="description"
            required
          />
        </div>

        <div className="flex justify-between">
        <a
            href={`https://wa.me/+57${encodeURIComponent(3054213899)}?text=${encodeURIComponent(`Hola Mercampus. Tengo una solicitud PQRS. Podrías ayudarme?`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
          >
            O hablar con soporte por Whatsapp <TbBrandWhatsapp className='icon'></TbBrandWhatsapp>
          </a>
          <button
            type="submit"
            className="btn btn-primary"
          >
            Enviar
          </button>
        </div>
      </form>
    </div>
  );
}
