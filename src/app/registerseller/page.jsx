"use client";
import { useState } from 'react';
import Schedule from '@/components/seller/Schedule';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';


const RegisterSeller = () => {
  //const { data: session } = useSession();
  const router = useRouter();

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
    phoneNumber:'',
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
    // Image uploading
    let uploadedImages = [];
    try {
      if (formData.images.length > 0) {
        uploadedImages = await Promise.all(
          formData.images.map(async (file) => {
            const imageFormData = new FormData();
            imageFormData.append('file', file);
            imageFormData.append('folder', 'sellerlogos');
            const response = await fetch('/api/uploadimageProduct', {
              method: 'POST',
              body: imageFormData,  // Send the file to the API
            });

            if (!response.ok) {
              throw new Error('Error uploading image');
            }
            const data = await response.json();
            return data.url;  // Assuming your API returns the URL
          })
        );
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('There was a problem uploading the images. Please try again.');
      return;
    }

    formData.logo = uploadedImages[0];
  
    try {
      
      const response = await fetch('/api/sellers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
  
      if (response.ok) {
        router.push('/registerseller/schedules');
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
        <div>
          <label>Logo</label>
          <input
            type="file"
            name="images"
            multiple
            onChange={(e) =>
              setFormData({ ...formData, images: [...e.target.files] })
            }
            required
          />
        </div>
        <button type="submit">Submit</button>
      </form>
    </div>
  );
};

export default RegisterSeller;