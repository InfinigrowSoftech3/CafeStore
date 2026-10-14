/**
 * Migration Script: Migrate local uploads to Cloudinary
 * Idempotently uploads local files from ./uploads to Cloudinary and rewrites stored URLs in MongoDB.
 *
 * NOTE: DO NOT RUN THIS SCRIPT UNTIL READY TO PERFORM THE ONE-TIME MIGRATION.
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';

dotenv.config();

import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Tenant from '../models/Tenant.js';
import GalleryItem from '../models/GalleryItem.js';
import NotificationCampaign from '../models/NotificationCampaign.js';
import Campaign from '../models/Campaign.js';
import { runWithSystemTenantAccess } from '../utils/tenantContext.js';

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');

export const migrateUploadsToCloudinary = async ({ dryRun = false } = {}) => {
  return runWithSystemTenantAccess(async () => {
  const cloudinaryUrl = process.env.CLOUDINARY_URL;
  if (!cloudinaryUrl) {
    throw new Error('CLOUDINARY_URL is not set in environment.');
  }

  cloudinary.config();

  if (mongoose.connection.readyState === 0) {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) throw new Error('MONGO_URI is not set.');
    await mongoose.connect(mongoUri);
    console.log('[Migration] Connected to MongoDB.');
  }

  if (!fs.existsSync(UPLOADS_DIR)) {
    console.log('[Migration] No uploads directory found at:', UPLOADS_DIR);
    return { uploaded: 0, updatedDocuments: 0 };
  }

  const files = await fs.promises.readdir(UPLOADS_DIR);
  console.log(`[Migration] Found ${files.length} local files in ./uploads.`);

  // Map local filename -> Cloudinary secure URL
  const urlMap = new Map();

  for (const filename of files) {
    const filePath = path.join(UPLOADS_DIR, filename);
    const stat = await fs.promises.stat(filePath);
    if (!stat.isFile()) continue;

    const baseName = path.parse(filename).name;
    const publicId = `brewhaus/legacy_uploads/${baseName}`;

    try {
      if (dryRun) {
        console.log(`[DryRun] Would upload ${filename} -> ${publicId}`);
        urlMap.set(filename, `https://res.cloudinary.com/demo/image/upload/${publicId}.jpg`);
        continue;
      }

      console.log(`[Migration] Uploading ${filename} to Cloudinary...`);
      const result = await cloudinary.uploader.upload(filePath, {
        public_id: publicId,
        overwrite: false, // Idempotent: don't overwrite if already uploaded
        resource_type: 'image',
      });
      urlMap.set(filename, result.secure_url);
    } catch (err) {
      console.warn(`[Migration] Upload notice for ${filename}:`, err.message);
      try {
        // If already exists, retrieve existing asset details
        const existing = await cloudinary.api.resource(publicId);
        if (existing?.secure_url) {
          urlMap.set(filename, existing.secure_url);
        }
      } catch {
        console.error(`[Migration] Could not resolve Cloudinary URL for ${filename}`);
      }
    }
  }

  console.log(`[Migration] Successfully mapped ${urlMap.size} files to Cloudinary URLs.`);

  let totalUpdated = 0;

  const replaceUrl = (currentUrl) => {
    if (!currentUrl || typeof currentUrl !== 'string') return currentUrl;
    if (currentUrl.includes('res.cloudinary.com')) return currentUrl; // Already migrated

    for (const [filename, newUrl] of urlMap.entries()) {
      if (currentUrl.includes(`/uploads/${filename}`)) {
        return newUrl;
      }
    }
    return currentUrl;
  };

  // 1. Products
  const products = await Product.find({
    image: { $regex: /uploads\// },
  });
  for (const product of products) {
    const updated = replaceUrl(product.image);
    if (updated !== product.image) {
      if (!dryRun) {
        product.image = updated;
        await product.save();
      }
      totalUpdated++;
    }
  }

  // 2. Categories
  const categories = await Category.find({
    icon: { $regex: /uploads\// },
  });
  for (const cat of categories) {
    const updated = replaceUrl(cat.icon);
    if (updated !== cat.icon) {
      if (!dryRun) {
        cat.icon = updated;
        await cat.save();
      }
      totalUpdated++;
    }
  }

  // 3. Tenants
  const tenants = await Tenant.find({
    $or: [
      { 'branding.logoUrl': { $regex: /uploads\// } },
      { 'branding.coverUrl': { $regex: /uploads\// } },
    ],
  });
  for (const tenant of tenants) {
    let changed = false;
    if (tenant.branding?.logoUrl) {
      const updatedLogo = replaceUrl(tenant.branding.logoUrl);
      if (updatedLogo !== tenant.branding.logoUrl) {
        tenant.branding.logoUrl = updatedLogo;
        changed = true;
      }
    }
    if (tenant.branding?.coverUrl) {
      const updatedCover = replaceUrl(tenant.branding.coverUrl);
      if (updatedCover !== tenant.branding.coverUrl) {
        tenant.branding.coverUrl = updatedCover;
        changed = true;
      }
    }
    if (changed) {
      if (!dryRun) await tenant.save();
      totalUpdated++;
    }
  }

  // 4. Gallery Items
  const galleryItems = await GalleryItem.find({
    imageUrl: { $regex: /uploads\// },
  });
  for (const item of galleryItems) {
    const updated = replaceUrl(item.imageUrl);
    if (updated !== item.imageUrl) {
      if (!dryRun) {
        item.imageUrl = updated;
        await item.save();
      }
      totalUpdated++;
    }
  }

  // 5. Notification Campaigns
  const notifCampaigns = await NotificationCampaign.find({
    image: { $regex: /uploads\// },
  });
  for (const camp of notifCampaigns) {
    const updated = replaceUrl(camp.image);
    if (updated !== camp.image) {
      if (!dryRun) {
        camp.image = updated;
        await camp.save();
      }
      totalUpdated++;
    }
  }

  // 6. Marketing Campaigns
  const campaigns = await Campaign.find({
    image: { $regex: /uploads\// },
  });
  for (const camp of campaigns) {
    const updated = replaceUrl(camp.image);
    if (updated !== camp.image) {
      if (!dryRun) {
        camp.image = updated;
        await camp.save();
      }
      totalUpdated++;
    }
  }

  console.log(`[Migration] Completed. Updated ${totalUpdated} documents across collections.`);
  return { uploaded: urlMap.size, updatedDocuments: totalUpdated };
  });
};

// Standalone execution entrypoint (Do NOT run automatically)
const isMain = process.argv[1] && process.argv[1].endsWith('migrate-uploads-to-cloudinary.js');
if (isMain) {
  migrateUploadsToCloudinary()
    .then((res) => {
      console.log('[Migration] Finished successfully:', res);
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Migration] Failed:', err);
      process.exit(1);
    });
}
