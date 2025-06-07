const express = require("express");
const { PrismaClient } = require("@prisma/client");
const QRCode = require("qrcode");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");
const cors = require("cors");
require("dotenv").config();

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Environment variables untuk URLs
const BASE_URL = process.env.BASE_URL || "https://zascript.com";	
const MOBILE_BASE_URL = process.env.MOBILE_BASE_URL || null; // Optional mobile app URL

// Helper function untuk generate URLs
const getEditUrl = (uuid) => `${BASE_URL}/edit/${uuid}`;
const getScanUrl = (uuid) => `${BASE_URL}/scan/${uuid}`;

// Helper function untuk detect mobile
const isMobileDevice = (userAgent) => {
  const mobileRegex =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i;
  return mobileRegex.test(userAgent);
};

// Helper function untuk generate mobile URLs
const getMobileEditUrl = (uuid) => {
  if (MOBILE_BASE_URL) {
    return `${MOBILE_BASE_URL}/edit/${uuid}`;
  }
  return null;
};

const getMobileScanUrl = (uuid) => {
  if (MOBILE_BASE_URL) {
    return `${MOBILE_BASE_URL}/scan/${uuid}`;
  }
  return null;
};

// API: Create user account (Admin only)
app.post("/api/admin/users", async (req, res) => {
  try {
    const { username, password, email } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ success: false, error: "Username and password are required" });
    }

    // Check if username already exists
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, error: "Username already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user dengan QR profile kosong
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        email: email || null,
        qrProfile: {
          create: {
            uuid: uuidv4(),
            name: username, // default name = username
            isPublished: false,
          },
        },
      },
      include: {
        qrProfile: true,
      },
    });

    // Generate initial QR code dengan BASE_URL
    const editUrl = getEditUrl(user.qrProfile.uuid);
    const qrCodeDataUrl = await QRCode.toDataURL(editUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    });

    // Update QR profile with QR code
    await prisma.qRProfile.update({
      where: { id: user.qrProfile.id },
      data: { qrCode: qrCodeDataUrl },
    });

    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        editUrl: editUrl,
        qrCode: qrCodeDataUrl,
        qrUuid: user.qrProfile.uuid,
        credentials: {
          username: username,
          password: password, // Return plain password for admin to give to user
        },
      },
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ success: false, error: "Failed to create user" });
  }
});

// API: Get all users (Admin)
app.get("/api/admin/users", async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        qrProfile: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const userData = users.map((user) => ({
      id: user.id,
      username: user.username,
      email: user.email,
      isActive: user.isActive,
      createdAt: user.createdAt,
      qrProfile: user.qrProfile
        ? {
            uuid: user.qrProfile.uuid,
            name: user.qrProfile.name,
            isPublished: user.qrProfile.isPublished,
            qrCode: user.qrProfile.qrCode,
            editUrl: getEditUrl(user.qrProfile.uuid),
            viewUrl: user.qrProfile.isPublished
              ? getScanUrl(user.qrProfile.uuid)
              : null,
            mobileEditUrl: getMobileEditUrl(user.qrProfile.uuid),
            mobileViewUrl: user.qrProfile.isPublished
              ? getMobileScanUrl(user.qrProfile.uuid)
              : null,
          }
        : null,
    }));

    res.json({
      success: true,
      data: userData,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ success: false, error: "Failed to fetch users" });
  }
});

// API: Toggle user active status (Admin)
app.put("/api/admin/users/:id/toggle-status", async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: { qrProfile: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
      include: { qrProfile: true },
    });

    res.json({
      success: true,
      data: {
        id: updatedUser.id,
        username: updatedUser.username,
        isActive: updatedUser.isActive,
      },
    });
  } catch (error) {
    console.error("Error toggling user status:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to toggle user status" });
  }
});

// API: Delete user (Admin)
app.delete("/api/admin/users/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.user.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ success: false, error: "Failed to delete user" });
  }
});

// API: Regenerate QR code (Admin)
app.post("/api/admin/qr/:uuid/regenerate", async (req, res) => {
  try {
    const { uuid } = req.params;

    const qrProfile = await prisma.qRProfile.findUnique({
      where: { uuid },
      include: { user: true },
    });

    if (!qrProfile) {
      return res
        .status(404)
        .json({ success: false, error: "QR Profile not found" });
    }

    // Generate new QR code dengan BASE_URL
    const editUrl = getEditUrl(uuid);
    const qrCodeDataUrl = await QRCode.toDataURL(editUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    });

    const updatedProfile = await prisma.qRProfile.update({
      where: { uuid },
      data: { qrCode: qrCodeDataUrl },
    });

    res.json({
      success: true,
      data: {
        uuid: updatedProfile.uuid,
        qrCode: updatedProfile.qrCode,
        editUrl: editUrl,
      },
    });
  } catch (error) {
    console.error("Error regenerating QR:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to regenerate QR code" });
  }
});

// USER ENDPOINTS

// API: User login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ success: false, error: "Username and password are required" });
    }

    const user = await prisma.user.findUnique({
      where: { username },
      include: { qrProfile: true },
    });

    if (!user) {
      return res
        .status(401)
        .json({ success: false, error: "Invalid credentials" });
    }

    if (!user.isActive) {
      return res
        .status(403)
        .json({ success: false, error: "Account is disabled" });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res
        .status(401)
        .json({ success: false, error: "Invalid credentials" });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
        qrProfile: user.qrProfile
          ? {
              uuid: user.qrProfile.uuid,
              name: user.qrProfile.name,
              bio: user.qrProfile.bio,
              avatar: user.qrProfile.avatar,
              instagram: user.qrProfile.instagram,
              twitter: user.qrProfile.twitter,
              tiktok: user.qrProfile.tiktok,
              youtube: user.qrProfile.youtube,
              linkedin: user.qrProfile.linkedin,
              facebook: user.qrProfile.facebook,
              website: user.qrProfile.website,
              isPublished: user.qrProfile.isPublished,
              qrCode: user.qrProfile.qrCode,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ success: false, error: "Login failed" });
  }
});

// API: Get QR profile by UUID (for edit page)
app.get("/api/qr/:uuid", async (req, res) => {
  try {
    const { uuid } = req.params;

    const qrProfile = await prisma.qRProfile.findUnique({
      where: { uuid },
      include: { user: true },
    });

    if (!qrProfile) {
      return res
        .status(404)
        .json({ success: false, error: "QR Profile not found" });
    }

    res.json({
      success: true,
      data: {
        uuid: qrProfile.uuid,
        name: qrProfile.name,
        bio: qrProfile.bio,
        avatar: qrProfile.avatar,
        instagram: qrProfile.instagram,
        twitter: qrProfile.twitter,
        tiktok: qrProfile.tiktok,
        youtube: qrProfile.youtube,
        linkedin: qrProfile.linkedin,
        facebook: qrProfile.facebook,
        website: qrProfile.website,
        isPublished: qrProfile.isPublished,
        user: {
          username: qrProfile.user.username,
          isActive: qrProfile.user.isActive,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching QR profile:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch QR profile" });
  }
});

// API: Update QR profile (User authenticated)
app.put("/api/qr/:uuid", async (req, res) => {
  try {
    const { uuid } = req.params;
    const {
      username,
      password,
      name,
      bio,
      avatar,
      instagram,
      twitter,
      tiktok,
      youtube,
      linkedin,
      facebook,
      website,
      isPublished,
    } = req.body;

    // Find QR profile with user
    const qrProfile = await prisma.qRProfile.findUnique({
      where: { uuid },
      include: { user: true },
    });

    if (!qrProfile) {
      return res
        .status(404)
        .json({ success: false, error: "QR Profile not found" });
    }

    // Verify user credentials
    if (!username || !password) {
      return res
        .status(401)
        .json({ success: false, error: "Username and password are required" });
    }

    if (qrProfile.user.username !== username) {
      return res
        .status(401)
        .json({ success: false, error: "Invalid credentials" });
    }

    const validPassword = await bcrypt.compare(
      password,
      qrProfile.user.password
    );
    if (!validPassword) {
      return res
        .status(401)
        .json({ success: false, error: "Invalid credentials" });
    }

    if (!qrProfile.user.isActive) {
      return res
        .status(403)
        .json({ success: false, error: "Account is disabled" });
    }

    // Update QR profile
    const updatedProfile = await prisma.qRProfile.update({
      where: { uuid },
      data: {
        name: name || qrProfile.name,
        bio: bio !== undefined ? bio : qrProfile.bio,
        avatar: avatar !== undefined ? avatar : qrProfile.avatar,
        instagram: instagram !== undefined ? instagram : qrProfile.instagram,
        twitter: twitter !== undefined ? twitter : qrProfile.twitter,
        tiktok: tiktok !== undefined ? tiktok : qrProfile.tiktok,
        youtube: youtube !== undefined ? youtube : qrProfile.youtube,
        linkedin: linkedin !== undefined ? linkedin : qrProfile.linkedin,
        facebook: facebook !== undefined ? facebook : qrProfile.facebook,
        website: website !== undefined ? website : qrProfile.website,
        isPublished:
          isPublished !== undefined ? isPublished : qrProfile.isPublished,
      },
    });

    res.json({
      success: true,
      data: {
        uuid: updatedProfile.uuid,
        name: updatedProfile.name,
        bio: updatedProfile.bio,
        avatar: updatedProfile.avatar,
        instagram: updatedProfile.instagram,
        twitter: updatedProfile.twitter,
        tiktok: updatedProfile.tiktok,
        youtube: updatedProfile.youtube,
        linkedin: updatedProfile.linkedin,
        facebook: updatedProfile.facebook,
        website: updatedProfile.website,
        isPublished: updatedProfile.isPublished,
        updatedAt: updatedProfile.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error updating QR profile:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to update QR profile" });
  }
});

// PUBLIC ENDPOINTS

// API: Get published QR profile for display (Public)
app.get("/api/public/qr/:uuid", async (req, res) => {
  try {
    const { uuid } = req.params;

    const qrProfile = await prisma.qRProfile.findUnique({
      where: { uuid },
      include: { user: true },
    });

    if (!qrProfile) {
      return res
        .status(404)
        .json({ success: false, error: "Profile not found" });
    }

    if (!qrProfile.isPublished) {
      return res
        .status(403)
        .json({ success: false, error: "Profile is not published" });
    }

    if (!qrProfile.user.isActive) {
      return res
        .status(403)
        .json({ success: false, error: "Profile is inactive" });
    }

    res.json({
      success: true,
      data: {
        uuid: qrProfile.uuid,
        name: qrProfile.name,
        bio: qrProfile.bio,
        avatar: qrProfile.avatar,
        instagram: qrProfile.instagram,
        twitter: qrProfile.twitter,
        tiktok: qrProfile.tiktok,
        youtube: qrProfile.youtube,
        linkedin: qrProfile.linkedin,
        facebook: qrProfile.facebook,
        website: qrProfile.website,
      },
    });
  } catch (error) {
    console.error("Error fetching public profile:", error);
    res.status(500).json({ success: false, error: "Failed to fetch profile" });
  }
});

// REDIRECT ROUTES dengan Mobile Detection

// Route redirect untuk edit (User edit page)
app.get("/edit/:uuid", async (req, res) => {
  try {
    const { uuid } = req.params;
    const userAgent = req.get("User-Agent") || "";
    const isMobile = isMobileDevice(userAgent);

    const qrProfile = await prisma.qRProfile.findUnique({
      where: { uuid },
      include: { user: true },
    });

    if (!qrProfile) {
      return res.status(404).send(`
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Edit Link Tidak Ditemukan</title>
          </head>
          <body style="font-family: Arial; text-align: center; padding: 50px; background: #f5f5f5;">
            <div style="background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 400px; margin: 0 auto;">
              <h2 style="color: #e74c3c; margin-bottom: 20px;">Edit Link tidak ditemukan</h2>
              <p style="color: #666;">QR Profile dengan kode ini tidak tersedia.</p>
            </div>
          </body>
        </html>
      `);
    }

    if (!qrProfile.user.isActive) {
      return res.status(403).send(`
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Akun Tidak Aktif</title>
          </head>
          <body style="font-family: Arial; text-align: center; padding: 50px; background: #f5f5f5;">
            <div style="background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 400px; margin: 0 auto;">
              <h2 style="color: #e74c3c; margin-bottom: 20px;">Akun tidak aktif</h2>
              <p style="color: #666;">Akun ini telah dinonaktifkan oleh admin.</p>
            </div>
          </body>
        </html>
      `);
    }

    // Redirect berdasarkan device dan availability
    if (isMobile && MOBILE_BASE_URL) {
      // Mobile app tersedia, redirect ke mobile app
      const mobileUrl = getMobileEditUrl(uuid);
      res.redirect(mobileUrl);
    } else {
      // Default ke web version
      res.redirect(`${BASE_URL}/edit/${uuid}`);
    }
  } catch (error) {
    console.error("Error in edit redirect:", error);
    res.status(500).send(`
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Terjadi Kesalahan</title>
        </head>
        <body style="font-family: Arial; text-align: center; padding: 50px; background: #f5f5f5;">
          <div style="background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 400px; margin: 0 auto;">
            <h2 style="color: #e74c3c; margin-bottom: 20px;">Terjadi kesalahan</h2>
            <p style="color: #666;">Silakan coba lagi nanti.</p>
          </div>
        </body>
      </html>
    `);
  }
});

// Route redirect untuk QR scan (Public view)
app.get("/scan/:uuid", async (req, res) => {
  try {
    const { uuid } = req.params;
    const userAgent = req.get("User-Agent") || "";
    const isMobile = isMobileDevice(userAgent);

    const qrProfile = await prisma.qRProfile.findUnique({
      where: { uuid },
      include: { user: true },
    });

    if (!qrProfile) {
      return res.status(404).send(`
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Profil Tidak Ditemukan</title>
          </head>
          <body style="font-family: Arial; text-align: center; padding: 50px; background: #f5f5f5;">
            <div style="background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 400px; margin: 0 auto;">
              <h2 style="color: #e74c3c; margin-bottom: 20px;">Profil tidak ditemukan</h2>
              <p style="color: #666;">QR Code ini tidak valid.</p>
            </div>
          </body>
        </html>
      `);
    }

    if (!qrProfile.isPublished) {
      return res.status(403).send(`
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Profil Belum Dipublikasi</title>
          </head>
          <body style="font-family: Arial; text-align: center; padding: 50px; background: #f5f5f5;">
            <div style="background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 400px; margin: 0 auto;">
              <h2 style="color: #f39c12; margin-bottom: 20px;">Profil belum dipublikasi</h2>
              <p style="color: #666;">Profil ini belum diatur oleh pemiliknya.</p>
            </div>
          </body>
        </html>
      `);
    }

    if (!qrProfile.user.isActive) {
      return res.status(403).send(`
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Profil Tidak Aktif</title>
          </head>
          <body style="font-family: Arial; text-align: center; padding: 50px; background: #f5f5f5;">
            <div style="background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 400px; margin: 0 auto;">
              <h2 style="color: #e74c3c; margin-bottom: 20px;">Profil tidak aktif</h2>
              <p style="color: #666;">Profil ini telah dinonaktifkan.</p>
            </div>
          </body>
        </html>
      `);
    }

    // Redirect berdasarkan device dan availability
    if (isMobile && MOBILE_BASE_URL) {
      // Mobile app tersedia, redirect ke mobile app
      const mobileUrl = getMobileScanUrl(uuid);
      res.redirect(mobileUrl);
    } else {
      // Default ke web version
      res.redirect(`${BASE_URL}/scan/${uuid}`);
    }
  } catch (error) {
    console.error("Error in scan redirect:", error);
    res.status(500).send(`
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Terjadi Kesalahan</title>
        </head>
        <body style="font-family: Arial; text-align: center; padding: 50px; background: #f5f5f5;">
          <div style="background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 400px; margin: 0 auto;">
            <h2 style="color: #e74c3c; margin-bottom: 20px;">Terjadi kesalahan</h2>
            <p style="color: #666;">Silakan coba lagi nanti.</p>
          </div>
        </body>
      </html>
    `);
  }
});

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    mobileBaseUrl: MOBILE_BASE_URL || "Not configured",
  });
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server running on port http://localhost:${PORT}`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Mobile Base URL: ${MOBILE_BASE_URL || "Not configured"}`);
});
