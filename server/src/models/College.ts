import { Schema, model, Document } from 'mongoose';

export interface ICollege extends Document {
  name: string;
  campusLocation: string;
  allowedEmailDomains: string[];
  pickupLocations: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const collegeSchema = new Schema<ICollege>(
  {
    name: {
      type: String,
      required: [true, 'College name is required'],
      unique: true,
      trim: true
    },
    campusLocation: {
      type: String,
      required: [true, 'Campus location is required (e.g. Powai, Mumbai)'],
      trim: true
    },
    allowedEmailDomains: {
      type: [String],
      required: [true, 'At least one allowed student email domain is required'],
      validate: {
        validator: (domains: string[]) => Array.isArray(domains) && domains.length > 0,
        message: 'Must specify at least one authorized domain (e.g., iitb.ac.in)'
      }
    },
    pickupLocations: {
      type: [String],
      required: true,
      default: [
        'Central Library Steps',
        'Student Activity Center (SAC)',
        'Main Canteen / Nescafe Hub',
        'Hostel Gate Foyer'
      ]
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

export const College = model<ICollege>('College', collegeSchema);
