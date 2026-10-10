import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB } from '../config/db';
import { College } from '../models/College';
import { User } from '../models/User';
import { Product } from '../models/Product';

export const seedDatabase = async (): Promise<void> => {
  console.log('[Seeder] Starting idempotent database seed...');
  await connectDB();

  // 1. Seed Demo College: IIT Bombay
  const collegeData = {
    name: 'IIT Bombay',
    campusLocation: 'Powai, Mumbai',
    allowedEmailDomains: ['iitb.ac.in', 'student.iitb.ac.in'],
    pickupLocations: [
      'Central Library Steps',
      'Student Activity Center (SAC)',
      'Main Canteen / Nescafe Hub',
      'Hostel Gate Foyer'
    ],
    isActive: true
  };

  const college = await College.findOneAndUpdate(
    { name: collegeData.name },
    { $set: collegeData },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log(`[Seeder] College verified/seeded: ${college.name} (${college._id})`);

  const plainPassword = 'DemoPassword123!';

  const demoUsers = [
    {
      name: 'Priya S.',
      email: 'priya.senior@iitb.ac.in',
      phone: '+919820123456',
      college: college._id,
      role: 'student' as const,
      isVerified: true,
      isSuspended: false,
      password: plainPassword
    },
    {
      name: 'Rahul M.',
      email: 'rahul.mech26@iitb.ac.in',
      phone: '+919819876543',
      college: college._id,
      role: 'student' as const,
      isVerified: true,
      isSuspended: false,
      password: plainPassword
    },
    {
      name: 'Suspended Student',
      email: 'suspended.student@iitb.ac.in',
      phone: '+919800000000',
      college: college._id,
      role: 'student' as const,
      isVerified: true,
      isSuspended: true,
      password: plainPassword
    }
  ];

  for (const userData of demoUsers) {
    const existing = await User.findOne({ email: userData.email });
    if (!existing) {
      await User.create(userData);
      console.log(`[Seeder] Created demo user: ${userData.name} (${userData.email})`);
    } else {
      // Idempotently update user attributes without creating duplicates
      existing.name = userData.name;
      existing.phone = userData.phone;
      existing.college = college._id;
      existing.isVerified = userData.isVerified;
      existing.isSuspended = userData.isSuspended;
      existing.password = plainPassword;
      await existing.save();
      console.log(`[Seeder] Updated demo user: ${userData.name} (${userData.email})`);
    }
  }

  // 3. Seed Sample Campus Listings (under Priya S.)
  const priya = await User.findOne({ email: 'priya.senior@iitb.ac.in' });
  if (priya) {
    const demoListings = [
      {
        title: 'Introduction to Algorithms (CLRS 3rd Ed.)',
        description:
          'Essential core reference for CS201 Algorithms. Mint condition, zero ink marks, covers dynamic programming and graph algorithms.',
        category: 'Textbooks & Notes' as const,
        condition: 'Good' as const,
        listingType: 'sell' as const,
        price: 450,
        originalPrice: 1599,
        courseCode: 'CS201',
        isbn: '9780262033848',
        campusPickupLocation: 'Central Library Steps',
        images: ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80'],
        seller: priya._id,
        college: college._id,
        status: 'available' as const
      },
      {
        title: 'Casio FX-991CW Advanced ClassWiz Calculator',
        description:
          'Purchased fresh in Jan, authentic non-programmable exam approved scientific calculator with high-res quad-tone display.',
        category: 'Electronics & Calculators' as const,
        condition: 'Like New' as const,
        listingType: 'sell' as const,
        price: 650,
        originalPrice: 1395,
        campusPickupLocation: 'Central Library Steps',
        images: ['https://images.unsplash.com/photo-1587145820266-a5951ee6f620?w=600&auto=format&fit=crop&q=80'],
        seller: priya._id,
        college: college._id,
        status: 'available' as const
      },
      {
        title: 'White Chemistry Lab Coat (Size L)',
        description:
          'Pure cotton standard lab coat with embroidered department pocket. Passing down for free to any junior taking freshman chem lab.',
        category: 'Lab Gear & Coats' as const,
        condition: 'Good' as const,
        listingType: 'free' as const,
        price: 0,
        originalPrice: 450,
        campusPickupLocation: 'Main Canteen / Nescafe Hub',
        images: ['https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80'],
        seller: priya._id,
        college: college._id,
        status: 'available' as const
      },
      {
        title: 'Hero Sprint 26T Campus Commuter Cycle',
        description:
          '18-speed rigid fork campus bicycle, both tires replaced recently, includes sturdy combination wire lock.',
        category: 'Bicycles & Commute' as const,
        condition: 'Good' as const,
        listingType: 'sell' as const,
        price: 2200,
        originalPrice: 6500,
        campusPickupLocation: 'Hostel Gate Foyer',
        images: ['https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=600&auto=format&fit=crop&q=80'],
        seller: priya._id,
        college: college._id,
        status: 'available' as const
      },
      {
        title: 'Arduino Uno R3 Starter Kit with Sensors',
        description:
          'Original ATmega328P microcontroller board with breadboard, ultrasonic sensor, servo motor, and jumper cables.',
        category: 'Maker & Arduino' as const,
        condition: 'Like New' as const,
        listingType: 'sell' as const,
        price: 850,
        originalPrice: 1800,
        campusPickupLocation: 'Student Activity Center (SAC)',
        images: ['https://images.unsplash.com/photo-1553406830-ef2513450d76?w=600&auto=format&fit=crop&q=80'],
        seller: priya._id,
        college: college._id,
        status: 'available' as const
      }
    ];

    for (const listing of demoListings) {
      await Product.findOneAndUpdate(
        { title: listing.title, seller: priya._id },
        { $set: listing },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
    console.log('[Seeder] Demo campus listings seeded successfully under Priya S.');
  }

  console.log('[Seeder] Database seeding finished successfully.');
};

// If executed directly from CLI: npm run seed
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('[Seeder] Process exiting cleanly.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Seeder] Error during seeding:', err);
      process.exit(1);
    });
}
