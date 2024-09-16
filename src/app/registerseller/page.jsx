"use client";
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

const RegisterSeller = () => {
  //const { data: session } = useSession();
  //const router = useRouter();

  /*if (!session) {
  *  router.push('/auth/signin');
  *  return null;
  */

  const [formData, setFormData] = useState({
    businessName: '',
    instagramUser: '',
    description: '',
    image: '',
    slogan: '',
    availability: true,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const response = await fetch('/api/sellers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    });

    if (response.ok) {
      router.push('/success');
    } else {
      console.error('Error submitting the data');
    }
  };

  return (
    <div>
      <h1>Seller Registration Form</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Business Name</label>
          <input
            type="text"
            name="businessName"
            value={formData.businessName}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label>Instagram User</label>
          <input
            type="text"
            name="instagramUser"
            value={formData.instagramUser}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label>Description</label>
          <input
            type="text"
            name="description"
            value={formData.description}
            onChange={handleChange}
          />
        </div>
        <div>
          <label>Image</label>
          <input
            type="text"
            name="image"
            value={formData.image}
            onChange={handleChange}
          />
        </div>
        <div>
          <label>Slogan</label>
          <input
            type="text"
            name="slogan"
            value={formData.slogan}
            onChange={handleChange}
          />
        </div>
        <div>
          <label>Availability</label>
          <input
            type="checkbox"
            name="availability"
            checked={formData.availability}
            onChange={handleChange}
          />
        </div>
        <button type="submit">Submit</button>
      </form>
    </div>
  );
};

export default RegisterSeller;