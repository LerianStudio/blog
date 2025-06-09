import { exec } from "child_process";
import { promisify } from "util";
import { join, resolve } from "path";
import { existsSync } from "fs";

const execAsync = promisify(exec);

export class HugoBuilder {
  private readonly hugoSitePath: string;
  private readonly maxConcurrentBuilds = 1;
  private buildInProgress = false;

  constructor() {
    // Use absolute path to prevent path traversal
    this.hugoSitePath = resolve(process.cwd(), "hugo-site");
    
    if (!existsSync(this.hugoSitePath)) {
      throw new Error(`Hugo site directory not found: ${this.hugoSitePath}`);
    }
  }

  async buildSite(): Promise<{ success: boolean; output?: string; error?: string }> {
    if (this.buildInProgress) {
      return { success: false, error: "Build already in progress" };
    }

    this.buildInProgress = true;

    try {
      console.log("Building Hugo site...");
      
      // Use absolute path and specific hugo command
      const { stdout, stderr } = await execAsync('hugo', {
        cwd: this.hugoSitePath,
        timeout: 30000, // 30 second timeout
        maxBuffer: 1024 * 1024, // 1MB buffer
      });

      if (stderr && !stderr.includes('WARN')) {
        console.error("Hugo build stderr:", stderr);
        return { success: false, error: "Hugo build failed", output: stderr };
      }

      console.log("Hugo site built successfully");
      return { success: true, output: stdout };

    } catch (error: any) {
      console.error("Hugo build error:", error.message);
      return { 
        success: false, 
        error: error.code === 'ENOENT' ? 'Hugo not found' : 'Build failed',
        output: error.message 
      };
    } finally {
      this.buildInProgress = false;
    }
  }
}

export const hugoBuilder = new HugoBuilder();