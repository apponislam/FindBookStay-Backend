import bcrypt from "bcrypt";
import { UserModel } from "./auth.model";
import { User } from "./auth.interface";
import config from "../../config";

export const seedAdmin = async () => {
    try {
        const { name, email, password, phone } = config.initialAdmin || {};

        if (!email || !password || !name || !phone) {
            console.log("⚠️ Initial admin configuration missing in environment variables, skipping admin seeding.");
            return;
        }

        const normalizedEmail = email.toLowerCase().trim();

        // 1. Check if user with this initial admin email already exists
        const adminByEmail = await UserModel.findOne({ email: normalizedEmail });

        if (adminByEmail) {
            if (adminByEmail.role !== "ADMIN") {
                await UserModel.updateOne(
                    { _id: adminByEmail._id },
                    {
                        $set: {
                            role: "ADMIN",
                            isActive: true,
                            isEmailVerified: true,
                            isDeleted: false,
                        },
                    }
                );
                console.log(`✅ Existing user (${normalizedEmail}) upgraded to ADMIN role.`);
            } else {
                console.log(`✅ Admin account (${normalizedEmail}) already exists, skipping creation.`);
            }
            return;
        }

        // 2. Check if any admin exists in the system
        const anyAdmin = await UserModel.findOne({ role: "ADMIN", isDeleted: false });
        if (anyAdmin) {
            console.log(`✅ Admin account (${anyAdmin.email}) already exists in system, skipping seeding.`);
            return;
        }

        // 3. Create initial admin
        console.log(`📝 No admin found in system. Seeding initial admin (${normalizedEmail})...`);

        const saltRounds = Number(config.bcrypt_salt_rounds) || 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const adminData: Partial<User> = {
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            role: "ADMIN",
            phone: phone.trim(),
            hasHome: false,
            hasStay: false,
            hasTurf: false,
            hasProperty: false,
            fcmTokens: [],
            isWrongReferral: false,
            wrongReferralCode: null,
            isActive: true,
            isEmailVerified: true,
            isDeleted: false,
        };

        await UserModel.create(adminData);
        console.log(`✅ Initial Admin created successfully: ${normalizedEmail}`);
    } catch (error) {
        console.error("❌ [Seed Admin] Error seeding admin account:", error);
    }
};
