import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserIcon,
  MapPinIcon,
  EnvelopeIcon,
  PhoneIcon,
  GlobeAltIcon,
  BriefcaseIcon,
  AcademicCapIcon,
  StarIcon,
  ChatBubbleLeftRightIcon,
  UserPlusIcon,
  CheckIcon,
  PencilIcon,
  CameraIcon,
  LinkIcon,
  EyeIcon,
  CalendarIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';

const ProfileCard = ({ 
  user, 
  isOwnProfile = false, 
  onConnect, 
  onMessage, 
  onEndorse,
  connectionStatus = 'none' // none, pending, connected
}) => {
  const [showAllSkills, setShowAllSkills] = useState(false);
  const [activeTab, setActiveTab] = useState('about');

  const mockUser = {
    name: user?.name || 'John Doe',
    role: user?.role || 'Job Seeker',
    headline: user?.headline || 'Software Engineer | Full Stack Developer',
    location: user?.location || 'San Francisco, CA',
    email: user?.email || 'john@example.com',
    phone: user?.phone || '+1 (555) 123-4567',
    website: user?.website || 'https://johndoe.dev',
    avatar: user?.avatar || null,
    banner: user?.banner || null,
    about: user?.about || 'Passionate software engineer with 5+ years of experience building scalable web applications. Specialized in React, Node.js, and cloud technologies.',
    skills: user?.skills || [
      { name: 'React', endorsements: 12, endorsed: true },
      { name: 'Node.js', endorsements: 8, endorsed: false },
      { name: 'JavaScript', endorsements: 15, endorsed: true },
      { name: 'TypeScript', endorsements: 6, endorsed: false },
      { name: 'Python', endorsements: 4, endorsed: false },
      { name: 'AWS', endorsements: 7, endorsed: true },
      { name: 'MongoDB', endorsements: 5, endorsed: false },
      { name: 'GraphQL', endorsements: 3, endorsed: false }
    ],
    experience: user?.experience || [
      {
        title: 'Senior Software Engineer',
        company: 'TechCorp',
        location: 'San Francisco, CA',
        duration: '2022 - Present',
        description: 'Led development of user-facing features for a SaaS platform serving 100k+ users.',
        current: true
      },
      {
        title: 'Software Engineer',
        company: 'StartupXYZ',
        location: 'Remote',
        duration: '2020 - 2022',
        description: 'Built full-stack applications using React and Node.js.',
        current: false
      }
    ],
    education: user?.education || [
      {
        degree: 'Bachelor of Computer Science',
        school: 'University of California',
        year: '2020',
        gpa: '3.8'
      }
    ],
    connections: user?.connections || 247,
    profileViews: user?.profileViews || 89,
    joinedDate: user?.joinedDate || '2020-01-15'
  };

  const displaySkills = showAllSkills ? mockUser.skills : mockUser.skills.slice(0, 6);

  const getConnectionButtonText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected';
      case 'pending':
        return 'Pending';
      default:
        return 'Connect';
    }
  };

  const getConnectionButtonIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <CheckIcon className="w-4 h-4" />;
      case 'pending':
        return <ClockIcon className="w-4 h-4" />;
      default:
        return <UserPlusIcon className="w-4 h-4" />;
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className="max-w-4xl mx-auto"
    >
      {/* Profile Header Card */}
      <motion.div variants={itemVariants} className="card-modern mb-6 overflow-hidden">
        {/* Banner */}
        <div className="relative h-48 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500">
          {mockUser.banner ? (
            <img src={mockUser.banner} alt="Profile banner" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500" />
          )}
          {isOwnProfile && (
            <button className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-colors">
              <CameraIcon className="w-5 h-5 text-white" />
            </button>
          )}
        </div>

        <div className="relative px-6 pb-6">
          {/* Avatar */}
          <div className="relative -mt-16 mb-4">
            <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full p-1">
              <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                {mockUser.avatar ? (
                  <img src={mockUser.avatar} alt={mockUser.name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <UserIcon className="w-16 h-16 text-gray-400" />
                )}
              </div>
            </div>
            {isOwnProfile && (
              <button className="absolute bottom-2 right-2 p-2 bg-white shadow-lg rounded-full hover:shadow-xl transition-all">
                <CameraIcon className="w-4 h-4 text-gray-600" />
              </button>
            )}
          </div>

          {/* Profile Info */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-800">{mockUser.name}</h1>
                {isOwnProfile && (
                  <button className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                    <PencilIcon className="w-4 h-4 text-gray-500" />
                  </button>
                )}
              </div>
              
              <p className="text-gray-600 font-medium mb-1">{mockUser.headline}</p>
              
              <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                <div className="flex items-center gap-1">
                  <MapPinIcon className="w-4 h-4" />
                  <span>{mockUser.location}</span>
                </div>
                <div className="flex items-center gap-1">
                  <UserPlusIcon className="w-4 h-4" />
                  <span>{mockUser.connections} connections</span>
                </div>
              </div>

              {/* Contact Info */}
              <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-6">
                <div className="flex items-center gap-2">
                  <EnvelopeIcon className="w-4 h-4" />
                  <a href={`mailto:${mockUser.email}`} className="hover:text-blue-600 transition-colors">
                    {mockUser.email}
                  </a>
                </div>
                {mockUser.phone && (
                  <div className="flex items-center gap-2">
                    <PhoneIcon className="w-4 h-4" />
                    <a href={`tel:${mockUser.phone}`} className="hover:text-blue-600 transition-colors">
                      {mockUser.phone}
                    </a>
                  </div>
                )}
                {mockUser.website && (
                  <div className="flex items-center gap-2">
                    <GlobeAltIcon className="w-4 h-4" />
                    <a href={mockUser.website} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors">
                      Portfolio
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            {!isOwnProfile && (
              <div className="flex flex-col sm:flex-row gap-3 mt-4 md:mt-0">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onConnect}
                  disabled={connectionStatus === 'connected'}
                  className={`btn-primary flex items-center gap-2 ${
                    connectionStatus === 'connected' 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : connectionStatus === 'pending'
                      ? 'bg-yellow-500 hover:bg-yellow-600'
                      : ''
                  }`}
                >\n                  {getConnectionButtonIcon()}\n                  {getConnectionButtonText()}\n                </motion.button>\n\n                <motion.button\n                  whileHover={{ scale: 1.05 }}\n                  whileTap={{ scale: 0.95 }}\n                  onClick={onMessage}\n                  className=\"btn-outline border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white flex items-center gap-2\"\n                >\n                  <ChatBubbleLeftRightIcon className=\"w-4 h-4\" />\n                  Message\n                </motion.button>\n              </div>\n            )}\n          </div>\n\n          {/* Profile Stats */}\n          <div className=\"grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-200\">\n            <div className=\"text-center\">\n              <div className=\"text-xl font-bold text-gray-800\">{mockUser.profileViews}</div>\n              <div className=\"text-sm text-gray-500\">Profile Views</div>\n            </div>\n            <div className=\"text-center\">\n              <div className=\"text-xl font-bold text-gray-800\">{mockUser.connections}</div>\n              <div className=\"text-sm text-gray-500\">Connections</div>\n            </div>\n            <div className=\"text-center\">\n              <div className=\"text-xl font-bold text-gray-800\">{mockUser.skills.length}</div>\n              <div className=\"text-sm text-gray-500\">Skills</div>\n            </div>\n            <div className=\"text-center\">\n              <div className=\"text-xl font-bold text-gray-800\">\n                {new Date().getFullYear() - new Date(mockUser.joinedDate).getFullYear()}\n              </div>\n              <div className=\"text-sm text-gray-500\">Years Active</div>\n            </div>\n          </div>\n        </div>\n      </motion.div>\n\n      {/* Profile Content Tabs */}\n      <motion.div variants={itemVariants} className=\"card-modern\">\n        {/* Tab Navigation */}\n        <div className=\"border-b border-gray-200 mb-6\">\n          <nav className=\"flex space-x-8\">\n            {['about', 'experience', 'education', 'skills'].map((tab) => (\n              <button\n                key={tab}\n                onClick={() => setActiveTab(tab)}\n                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${\n                  activeTab === tab\n                    ? 'border-blue-500 text-blue-600'\n                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'\n                }`}\n              >\n                {tab.charAt(0).toUpperCase() + tab.slice(1)}\n              </button>\n            ))}\n          </nav>\n        </div>\n\n        {/* Tab Content */}\n        <AnimatePresence mode=\"wait\">\n          <motion.div\n            key={activeTab}\n            initial={{ opacity: 0, y: 20 }}\n            animate={{ opacity: 1, y: 0 }}\n            exit={{ opacity: 0, y: -20 }}\n            transition={{ duration: 0.3 }}\n          >\n            {activeTab === 'about' && (\n              <div>\n                <h3 className=\"text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2\">\n                  <UserIcon className=\"w-5 h-5\" />\n                  About\n                </h3>\n                <p className=\"text-gray-700 leading-relaxed\">{mockUser.about}</p>\n              </div>\n            )}\n\n            {activeTab === 'experience' && (\n              <div>\n                <h3 className=\"text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2\">\n                  <BriefcaseIcon className=\"w-5 h-5\" />\n                  Experience\n                </h3>\n                <div className=\"space-y-6\">\n                  {mockUser.experience.map((exp, index) => (\n                    <div key={index} className=\"relative pl-8\">\n                      <div className=\"absolute left-0 top-2 w-3 h-3 bg-blue-500 rounded-full\" />\n                      {index < mockUser.experience.length - 1 && (\n                        <div className=\"absolute left-1.5 top-5 w-0.5 h-full bg-gray-200\" />\n                      )}\n                      <div className=\"bg-gray-50 rounded-lg p-4\">\n                        <h4 className=\"font-semibold text-gray-800 mb-1\">{exp.title}</h4>\n                        <div className=\"flex items-center gap-2 text-sm text-gray-600 mb-2\">\n                          <BuildingOfficeIcon className=\"w-4 h-4\" />\n                          <span>{exp.company}</span>\n                          <span>•</span>\n                          <span>{exp.location}</span>\n                        </div>\n                        <div className=\"flex items-center gap-1 text-sm text-gray-500 mb-3\">\n                          <CalendarIcon className=\"w-4 h-4\" />\n                          <span>{exp.duration}</span>\n                          {exp.current && (\n                            <span className=\"ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full\">\n                              Current\n                            </span>\n                          )}\n                        </div>\n                        <p className=\"text-gray-700 text-sm\">{exp.description}</p>\n                      </div>\n                    </div>\n                  ))}\n                </div>\n              </div>\n            )}\n\n            {activeTab === 'education' && (\n              <div>\n                <h3 className=\"text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2\">\n                  <AcademicCapIcon className=\"w-5 h-5\" />\n                  Education\n                </h3>\n                <div className=\"space-y-4\">\n                  {mockUser.education.map((edu, index) => (\n                    <div key={index} className=\"bg-gray-50 rounded-lg p-4\">\n                      <h4 className=\"font-semibold text-gray-800 mb-1\">{edu.degree}</h4>\n                      <p className=\"text-gray-600 mb-1\">{edu.school}</p>\n                      <div className=\"flex items-center gap-4 text-sm text-gray-500\">\n                        <span>Class of {edu.year}</span>\n                        {edu.gpa && <span>GPA: {edu.gpa}</span>}\n                      </div>\n                    </div>\n                  ))}\n                </div>\n              </div>\n            )}\n\n            {activeTab === 'skills' && (\n              <div>\n                <div className=\"flex items-center justify-between mb-4\">\n                  <h3 className=\"text-lg font-semibold text-gray-800 flex items-center gap-2\">\n                    <StarIcon className=\"w-5 h-5\" />\n                    Skills & Endorsements\n                  </h3>\n                  {mockUser.skills.length > 6 && (\n                    <button\n                      onClick={() => setShowAllSkills(!showAllSkills)}\n                      className=\"text-blue-600 hover:text-blue-700 font-medium text-sm\"\n                    >\n                      {showAllSkills ? 'Show Less' : `Show All ${mockUser.skills.length}`}\n                    </button>\n                  )}\n                </div>\n                <div className=\"grid grid-cols-1 md:grid-cols-2 gap-4\">\n                  <AnimatePresence>\n                    {displaySkills.map((skill, index) => (\n                      <motion.div\n                        key={skill.name}\n                        initial={{ opacity: 0, scale: 0.9 }}\n                        animate={{ opacity: 1, scale: 1 }}\n                        exit={{ opacity: 0, scale: 0.9 }}\n                        transition={{ delay: index * 0.1 }}\n                        className=\"bg-gray-50 rounded-lg p-4\"\n                      >\n                        <div className=\"flex items-center justify-between mb-2\">\n                          <h4 className=\"font-medium text-gray-800\">{skill.name}</h4>\n                          {!isOwnProfile && (\n                            <motion.button\n                              whileHover={{ scale: 1.05 }}\n                              whileTap={{ scale: 0.95 }}\n                              onClick={() => onEndorse(skill.name)}\n                              className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${\n                                skill.endorsed\n                                  ? 'bg-blue-100 text-blue-800 cursor-default'\n                                  : 'bg-white border border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white'\n                              }`}\n                            >\n                              {skill.endorsed ? '✓ Endorsed' : '+ Endorse'}\n                            </motion.button>\n                          )}\n                        </div>\n                        <div className=\"flex items-center gap-2 text-sm text-gray-600\">\n                          <span>{skill.endorsements} endorsements</span>\n                        </div>\n                      </motion.div>\n                    ))}\n                  </AnimatePresence>\n                </div>\n              </div>\n            )}\n          </motion.div>\n        </AnimatePresence>\n      </motion.div>\n    </motion.div>\n  );\n};\n\nexport default ProfileCard;"