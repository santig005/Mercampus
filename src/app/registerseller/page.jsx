"use client";
import { useState } from 'react';
import Schedule from '@/components/seller/Schedule';
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
    logo: '',
    slogan: '',
    phoneNumber:''
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
  
    try {
      const response = await fetch('/api/sellers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
  
      if (response.ok) {
        router.push('/antojos');
      } else {
        const errorData = await response.json();
        console.error('Error:', errorData.message);
      }
    } catch (error) {
      console.error('Network Error:', error);
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
          <label>Description</label>
          <input
            type="text"
            name="description"
            value={formData.description}
            onChange={handleChange}
          />
        </div>
        <div>
          <label>Logo</label>
          <input
            type="text"
            name="Logo"
            value={formData.logo}
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
          <label>Phone Number</label>
          <input
            type="text"
            name="phoneNumber"
            value={formData.phoneNumber}
            onChange={handleChange}
            required
          />
        </div>
        <button type="submit">Submit</button>
      </form>
    </div>
  );
};

export default RegisterSeller;