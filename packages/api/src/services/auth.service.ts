import { PrismaClient } from "@prisma/client";
import { hashPassword, verifyPassword } from "@starter-kit/shared";
import { createError } from "../middleware/error-handler";

const prisma = new PrismaClient();

interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

interface LoginInput {
  email: string;
  password: string;
}

export class AuthService {
  async register(input: RegisterInput) {
    // Check if email already exists
    const existing = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existing) {
      throw createError("Email already in use", 409);
    }

    // Hash password
    const passwordHash = await hashPassword(input.password);

    // Create user
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        password: passwordHash,
        role: "CANDIDATE", // default role
      },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }

  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      throw createError("Invalid credentials", 401);
    }

    const isValid = await verifyPassword(input.password, user.password);

    if (!isValid) {
      throw createError("Invalid credentials", 401);
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw createError("User not found", 404);
    }

    return user;
  }

  async refresh() {
    return { message: "Not implemented yet" };
  }

  async logout() {
    return { message: "Logged out" };
  }
}

export const authService = new AuthService();