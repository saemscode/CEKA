 # 🇰🇪 CEKA – Civic Education Kenya App

**CEKA** (Civic Education Kenya App) is a community-led open-source platform built to bridge the civic knowledge gap and empower Kenyan citizens with accessible, accurate, and engaging civic education.

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Open Source](https://img.shields.io/badge/Open%20Source-❤️-red.svg)](https://github.com/CivicEdKenyaApp/CEKA)
[![Community Driven](https://img.shields.io/badge/Community-Driven-green.svg)](#-contributing)

---

## 🌍 Why CEKA?

CEKA is a civic tech project built **for the people, by the people**. In a democracy, informed citizens are empowered citizens. We aim to:

- **Bridge Knowledge Gaps** - Make civic education accessible, engaging, and easy to understand
- **Promote Transparency** - Provide clear, verified information about governance and civic processes  
- **Inspire Action** - Connect citizens with tools and opportunities for meaningful civic participation
- **Foster Community** - Create spaces for constructive civic dialogue and collaboration
- **Enable Global Impact** - Serve as a template for civic education initiatives worldwide

### 🎯 Core Features

- **📊 Legislative Tracker** - Follow bills, laws, and legislative processes with AI-powered summaries
- **📚 Resource Hub** - Access civic education materials, articles, and interactive content
- **🤝 Community Portal** - Engage in discussions and connect with like-minded citizens
- **🎓 Interactive Learning** - Take quizzes and track your civic knowledge progress
- **🌐 Multilingual Support** - Available in English and Swahili
- **📱 Offline Access** - Download resources for use without internet connectivity
- **🔍 Anonymous Contributions** - Submit legislative insights and resources for community benefit

---

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/CivicEdKenyaApp/CEKA.git
cd CEKA
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Set Up Environment Variables
Copy the example environment file and add your configuration:
```bash
cp .env.example .env
```

Update `.env` with your credentials (available from your Supabase dashboard):
```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

> 🔐 **Security Note**: Never commit your `.env` file. It's already included in `.gitignore`.

### 4. Run the Development Server
```bash
npm run dev
```
Your app should be running at [http://localhost:5173](http://localhost:5173)

### 5. Build for Production
```bash
npm run build
```

---

## 🧠 Technology Stack

### Frontend
- **[React 18](https://react.dev/)** - Modern UI library with hooks and concurrent features
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript development
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework
- **[Vite](https://vitejs.dev/)** - Fast build tool and development server
- **[Framer Motion](https://www.framer.com/motion/)** - Smooth animations and interactions
- **[GSAP](https://greensock.com/gsap/)** - High-performance animations

### Backend & Services
- **[Supabase](https://supabase.com/)** - Authentication, PostgreSQL database, and real-time features
- **[OpenAI API](https://openai.com/api/)** - Content summarization and categorization

---

## 🛠️ Contributing

We welcome all collaborators — **developers, designers, educators, civic advocates, and citizens**! CEKA thrives on community contributions.

### How to Contribute

1. **Fork the repository**
   ```bash
   git clone https://github.com/CivicEdKenyaApp/CEKA.git
   cd CEKA
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Follow our [coding standards](CONTRIBUTING.md#coding-standards)
   - Write clear commit messages
   - Add tests for new features

4. **Test your changes**
   ```bash
   npm run test
   ```

5. **Submit a pull request**
   - Provide a clear description of your changes
   - Reference any related issues
   - Include screenshots for UI changes

### 🎯 Areas Where We Need Help

- **🔧 Development** - Frontend components, backend APIs, database optimization
- **🎨 Design** - UI/UX improvements, accessibility enhancements
- **📝 Content** - Civic education materials, translations (Swahili, other Kenyan languages)
- **🧪 Testing** - Manual testing, automated test writing
- **📚 Documentation** - API docs, user guides, contribution guidelines

---

## 📦 Deployment

CEKA is designed for easy deployment across multiple platforms:

### Frontend
- **[Vercel](https://vercel.com/)** (Recommended)
- **[Netlify](https://netlify.com/)**

### Backend
- **[Supabase](https://supabase.com/)** + Auth 

---

## 🔒 Security & Privacy

CEKA takes user privacy and security seriously:

- **🔐 Secure Authentication** - Supabase Auth for identity management
- **🛡️ Data Protection** - User data is encrypted and stored securely
- **👤 Anonymous Contributions** - Users can contribute without revealing identity
- **📊 Privacy-First Analytics** - No personal data tracking or sharing

For security issues, please email: [civiceducationkenya@gmail.com](mailto:civiceducationkenya@gmail.com)

---

## 🌐 Community & Support

### Get Help
- **💬 Discussions**: [GitHub Discussions](https://github.com/CivicEdKenyaApp/CEKA/discussions)
- **🐛 Bug Reports**: [GitHub Issues](https://github.com/CivicEdKenyaApp/CEKA/issues)
- **📧 Email**: [civiceducationkenya@gmail.com](mailto:civiceducationkenya@gmail.com)

### Stay Connected
- **📱 Instagram**: [@civiceducationke](https://instagram.com/civiceducationke)
- **🐦 Twitter**: [@CEKAApp](https://twitter.com/CEKAApp)

### Support the Project
CEKA is community-supported. Your support helps us maintain infrastructure and create content.

**[☕ Buy Me A Coffee](https://ko-fi.com/civiceducationkenya)**

---

## 📄 License
This project is open source and available under the **[MIT License](LICENSE)**.

**What this means:**
- ✅ **Commercial Use** - Use CEKA in commercial projects
- ✅ **Modification** - Modify and adapt the code
- ✅ **Distribution** - Share and redistribute freely
- ✅ **Private Use** - Use for private/internal projects
- ✅ **Patent Grant** - Protection from patent claims

**Requirements:**
- 📄 **License Notice** - Include the MIT license in distributions
- 📝 **Copyright Notice** - Credit the original authors

### Content Licensing
Educational content is licensed under **[Creative Commons CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)**

### Trademark
"CEKA" and the CEKA logo are trademarks of the CEKA Project. See [TRADEMARK.md](TRADEMARK.md) for usage guidelines.

---

## 🗺️ Roadmap

### Phase 1: Core Platform (Q2 2025) ✅
- [x] Basic legislative tracker
- [x] Resource hub with offline access
- [x] User authentication
- [x] Mobile-responsive design

### Phase 2: AI Integration (Q3 2025) 🚧
- [ ] AI-powered content summarization
- [ ] Anonymous contribution processing
- [ ] Personalized content recommendations
- [ ] Automated content categorization

### Phase 3: Community Features (Q4 2025) 📅
- [ ] Discussion forums
- [ ] Petition and campaign tools
- [ ] Volunteer opportunity matching
- [ ] Event management system

### Phase 4: Scale & Impact (2026) 🚀
- [ ] Multi-country adaptation
- [ ] Advanced analytics dashboard
- [ ] Government partnership integrations
- [ ] Educational institution partnerships

See our [detailed roadmap](https://github.com/CivicEdKenyaApp/CEKA/projects) for specific milestones and progress.

---

## 🙏 Acknowledgments

CEKA exists thanks to the contributions of:

- **👥 Contributors** - Developers, designers, and civic advocates who build CEKA
- **🏛️ Civic Organizations** - Partners who provide expertise and guidance
- **🎓 Educational Institutions** - Schools and universities that use and improve CEKA
- **💰 Supporters** - Individuals and organizations that fund development
- **🇰🇪 Kenyan Citizens** - The community that CEKA serves and learns from

### Special Thanks
- Open source communities that inspire civic technology
- Democracy and transparency advocates worldwide
- The next generation of Kenyan civic leaders

---

## 📈 Impact Metrics

Since launch, CEKA has:
- 📊 **40,000 Active Users** across Kenya
- 📚 **00's of Civic Resources** in our database  
- 🏛️ **15 Bills Tracked** in our legislative tracker
- 🤝 **Dozens of Community Contributions** from citizens
- 🌍 **4 Countries** exploring CEKA adaptation

*Updated monthly - see [impact dashboard](https://civiceducationkenya.com/impact) for real-time metrics.*

---

<div align="center">

**Built with ❤️ for Kenya and democracy worldwide**

[🌟 Star this repo](https://github.com/CivicEdKenyaApp/CEKA) | [🍴 Fork for your country](https://github.com/CivicEdKenyaApp/CEKA/fork) | [📧 Get in touch](mailto:contact@civiceducationkenya.com)

---

*"The best way to predict the future is to create it." - Peter Drucker*

</div>
