import { Request, Response, NextFunction } from 'express';
import { College } from '../models/College';

/**
 * GET /api/v1/colleges
 * Public discovery of campuses and authorized student email domains.
 */
export const getColleges = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const colleges = await College.find({ isActive: true })
      .select('name campusLocation allowedEmailDomains pickupLocations')
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      data: {
        colleges
      }
    });
  } catch (error) {
    next(error);
  }
};
