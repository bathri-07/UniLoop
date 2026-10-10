import { Router } from 'express';
import { getColleges } from '../controllers/collegeController';

const router = Router();

// Public college discovery
router.get('/', getColleges);

export default router;
