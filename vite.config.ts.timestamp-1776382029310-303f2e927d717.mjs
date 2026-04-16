// vite.config.ts
import { defineConfig, loadEnv } from "file:///D:/CEKA/ceka%20v010/CEKA/node_modules/vite/dist/node/index.js";
import react from "file:///D:/CEKA/ceka%20v010/CEKA/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import { componentTagger } from "file:///D:/CEKA/ceka%20v010/CEKA/node_modules/lovable-tagger/dist/index.js";
var __vite_injected_original_dirname = "D:\\CEKA\\ceka v010\\CEKA";
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  console.log("[ViteConfig] Mode:", mode);
  console.log("[ViteConfig] CWD:", process.cwd());
  console.log("[ViteConfig] Env keys loaded:", Object.keys(env).filter((k) => k.startsWith("VITE_")));
  return {
    server: {
      host: "::",
      port: 8080
    },
    plugins: [
      react(),
      mode === "development" && componentTagger()
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__vite_injected_original_dirname, "./src")
      }
    },
    // Explicitly define env variables to ensure they're available to the client
    // We map each VITE_ variable individually to ensure maximum compatibility in both Dev and Prod
    define: Object.keys(env).reduce((prev, key) => {
      if (key.startsWith("VITE_")) {
        const value = JSON.stringify(env[key]);
        prev[`process.env.${key}`] = value;
        prev[`import.meta.env.${key}`] = value;
        prev[`globalThis.${key}`] = value;
      }
      return prev;
    }, {
      "process.env": {}
    })
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxDRUtBXFxcXGNla2EgdjAxMFxcXFxDRUtBXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJEOlxcXFxDRUtBXFxcXGNla2EgdjAxMFxcXFxDRUtBXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9EOi9DRUtBL2Nla2ElMjB2MDEwL0NFS0Evdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcsIGxvYWRFbnYgfSBmcm9tIFwidml0ZVwiO1xyXG5pbXBvcnQgcmVhY3QgZnJvbSBcIkB2aXRlanMvcGx1Z2luLXJlYWN0LXN3Y1wiO1xyXG5pbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiO1xyXG5pbXBvcnQgeyBjb21wb25lbnRUYWdnZXIgfSBmcm9tIFwibG92YWJsZS10YWdnZXJcIjtcclxuXHJcbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+IHtcclxuICBjb25zdCBlbnYgPSBsb2FkRW52KG1vZGUsIHByb2Nlc3MuY3dkKCksICcnKTtcclxuICBjb25zb2xlLmxvZygnW1ZpdGVDb25maWddIE1vZGU6JywgbW9kZSk7XHJcbiAgY29uc29sZS5sb2coJ1tWaXRlQ29uZmlnXSBDV0Q6JywgcHJvY2Vzcy5jd2QoKSk7XHJcbiAgY29uc29sZS5sb2coJ1tWaXRlQ29uZmlnXSBFbnYga2V5cyBsb2FkZWQ6JywgT2JqZWN0LmtleXMoZW52KS5maWx0ZXIoayA9PiBrLnN0YXJ0c1dpdGgoJ1ZJVEVfJykpKTtcclxuXHJcbiAgcmV0dXJuIHtcclxuICAgIHNlcnZlcjoge1xyXG4gICAgICBob3N0OiBcIjo6XCIsXHJcbiAgICAgIHBvcnQ6IDgwODAsXHJcbiAgICB9LFxyXG4gICAgcGx1Z2luczogW1xyXG4gICAgICByZWFjdCgpLFxyXG4gICAgICBtb2RlID09PSAnZGV2ZWxvcG1lbnQnICYmXHJcbiAgICAgIGNvbXBvbmVudFRhZ2dlcigpLFxyXG4gICAgXS5maWx0ZXIoQm9vbGVhbiksXHJcbiAgICByZXNvbHZlOiB7XHJcbiAgICAgIGFsaWFzOiB7XHJcbiAgICAgICAgXCJAXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9zcmNcIiksXHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG4gICAgLy8gRXhwbGljaXRseSBkZWZpbmUgZW52IHZhcmlhYmxlcyB0byBlbnN1cmUgdGhleSdyZSBhdmFpbGFibGUgdG8gdGhlIGNsaWVudFxyXG4gICAgLy8gV2UgbWFwIGVhY2ggVklURV8gdmFyaWFibGUgaW5kaXZpZHVhbGx5IHRvIGVuc3VyZSBtYXhpbXVtIGNvbXBhdGliaWxpdHkgaW4gYm90aCBEZXYgYW5kIFByb2RcclxuICAgIGRlZmluZTogT2JqZWN0LmtleXMoZW52KS5yZWR1Y2U8UmVjb3JkPHN0cmluZywgYW55Pj4oKHByZXYsIGtleSkgPT4ge1xyXG4gICAgICBpZiAoa2V5LnN0YXJ0c1dpdGgoJ1ZJVEVfJykpIHtcclxuICAgICAgICBjb25zdCB2YWx1ZSA9IEpTT04uc3RyaW5naWZ5KGVudltrZXldKTtcclxuICAgICAgICBwcmV2W2Bwcm9jZXNzLmVudi4ke2tleX1gXSA9IHZhbHVlO1xyXG4gICAgICAgIHByZXZbYGltcG9ydC5tZXRhLmVudi4ke2tleX1gXSA9IHZhbHVlO1xyXG4gICAgICAgIC8vIEFsc28gaW5qZWN0IGludG8gZ2xvYmFsVGhpcyBmb3IgYWJzb2x1dGUgY2VydGFpbnR5IGluIGFsbCBjb250ZXh0c1xyXG4gICAgICAgIHByZXZbYGdsb2JhbFRoaXMuJHtrZXl9YF0gPSB2YWx1ZTtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gcHJldjtcclxuICAgIH0sIHtcclxuICAgICAgJ3Byb2Nlc3MuZW52Jzoge31cclxuICAgIH0pXHJcblxyXG4gIH07XHJcbn0pO1xyXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQThQLFNBQVMsY0FBYyxlQUFlO0FBQ3BTLE9BQU8sV0FBVztBQUNsQixPQUFPLFVBQVU7QUFDakIsU0FBUyx1QkFBdUI7QUFIaEMsSUFBTSxtQ0FBbUM7QUFNekMsSUFBTyxzQkFBUSxhQUFhLENBQUMsRUFBRSxLQUFLLE1BQU07QUFDeEMsUUFBTSxNQUFNLFFBQVEsTUFBTSxRQUFRLElBQUksR0FBRyxFQUFFO0FBQzNDLFVBQVEsSUFBSSxzQkFBc0IsSUFBSTtBQUN0QyxVQUFRLElBQUkscUJBQXFCLFFBQVEsSUFBSSxDQUFDO0FBQzlDLFVBQVEsSUFBSSxpQ0FBaUMsT0FBTyxLQUFLLEdBQUcsRUFBRSxPQUFPLE9BQUssRUFBRSxXQUFXLE9BQU8sQ0FBQyxDQUFDO0FBRWhHLFNBQU87QUFBQSxJQUNMLFFBQVE7QUFBQSxNQUNOLE1BQU07QUFBQSxNQUNOLE1BQU07QUFBQSxJQUNSO0FBQUEsSUFDQSxTQUFTO0FBQUEsTUFDUCxNQUFNO0FBQUEsTUFDTixTQUFTLGlCQUNULGdCQUFnQjtBQUFBLElBQ2xCLEVBQUUsT0FBTyxPQUFPO0FBQUEsSUFDaEIsU0FBUztBQUFBLE1BQ1AsT0FBTztBQUFBLFFBQ0wsS0FBSyxLQUFLLFFBQVEsa0NBQVcsT0FBTztBQUFBLE1BQ3RDO0FBQUEsSUFDRjtBQUFBO0FBQUE7QUFBQSxJQUdBLFFBQVEsT0FBTyxLQUFLLEdBQUcsRUFBRSxPQUE0QixDQUFDLE1BQU0sUUFBUTtBQUNsRSxVQUFJLElBQUksV0FBVyxPQUFPLEdBQUc7QUFDM0IsY0FBTSxRQUFRLEtBQUssVUFBVSxJQUFJLEdBQUcsQ0FBQztBQUNyQyxhQUFLLGVBQWUsR0FBRyxFQUFFLElBQUk7QUFDN0IsYUFBSyxtQkFBbUIsR0FBRyxFQUFFLElBQUk7QUFFakMsYUFBSyxjQUFjLEdBQUcsRUFBRSxJQUFJO0FBQUEsTUFDOUI7QUFDQSxhQUFPO0FBQUEsSUFDVCxHQUFHO0FBQUEsTUFDRCxlQUFlLENBQUM7QUFBQSxJQUNsQixDQUFDO0FBQUEsRUFFSDtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
