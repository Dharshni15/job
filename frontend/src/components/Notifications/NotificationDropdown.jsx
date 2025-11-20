import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BellIcon,
  CheckIcon,
  XMarkIcon,
  EyeIcon,
  TrashIcon,
  UserPlusIcon,
  BriefcaseIcon,
  ChatBubbleLeftRightIcon,
  StarIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const NotificationDropdown = ({ isOpen, onClose, notifications = [], onMarkAsRead, onMarkAllAsRead, onDelete }) => {
  const dropdownRef = useRef(null);
  const [filter, setFilter] = useState('all'); // all, unread, read

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  const getNotificationIcon = (type) => {
    const iconClass = "w-5 h-5";
    switch (type) {
      case 'job_match':
        return <BriefcaseIcon className={iconClass} />;
      case 'message':
        return <ChatBubbleLeftRightIcon className={iconClass} />;
      case 'connection':
        return <UserPlusIcon className={iconClass} />;
      case 'endorsement':
        return <StarIcon className={iconClass} />;
      case 'system':
        return <ExclamationTriangleIcon className={iconClass} />;
      default:
        return <BellIcon className={iconClass} />;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'job_match':
        return 'from-blue-500 to-indigo-600';
      case 'message':
        return 'from-green-500 to-emerald-600';
      case 'connection':
        return 'from-purple-500 to-pink-600';
      case 'endorsement':
        return 'from-yellow-500 to-orange-600';
      case 'system':
        return 'from-red-500 to-rose-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return time.toLocaleDateString();
  };

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') return !notification.read;
    if (filter === 'read') return notification.read;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const dropdownVariants = {
    hidden: {
      opacity: 0,
      scale: 0.95,
      y: -10
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.2,
        ease: "easeOut"
      }
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      y: -10,
      transition: {
        duration: 0.15
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={dropdownRef}
          variants={dropdownVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="absolute right-0 top-12 w-96 max-w-sm glass backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl z-50"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                Notifications
                {unreadCount > 0 && (
                  <span className="ml-2 px-2 py-1 bg-red-500 text-white text-xs rounded-full">
                    {unreadCount}
                  </span>
                )}
              </h3>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-white/70" />
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex space-x-1 bg-white/10 rounded-lg p-1">
              {['all', 'unread', 'read'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all duration-200 ${
                    filter === tab
                      ? 'bg-white/20 text-white shadow-sm'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  {tab === 'unread' && unreadCount > 0 && (
                    <span className="ml-1 text-xs">({unreadCount})</span>
                  )}
                </button>
              ))}
            </div>

            {/* Actions */}
            {unreadCount > 0 && (
              <div className="mt-3 flex justify-end">
                <button
                  onClick={onMarkAllAsRead}
                  className="text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors"
                >
                  Mark all as read
                </button>
              </div>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto custom-scrollbar">
            <AnimatePresence>
              {filteredNotifications.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-6 text-center"
                >
                  <BellIcon className="w-12 h-12 text-white/30 mx-auto mb-3" />
                  <p className="text-white/70 text-sm">
                    {filter === 'unread' 
                      ? 'No unread notifications' 
                      : filter === 'read' 
                      ? 'No read notifications'
                      : 'No notifications yet'
                    }
                  </p>
                  <p className="text-white/50 text-xs mt-1">
                    We'll notify you when something happens
                  </p>
                </motion.div>
              ) : (
                <div className="p-2">
                  {filteredNotifications.map((notification, index) => (
                    <motion.div
                      key={notification.id}
                      variants={itemVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      transition={{ delay: index * 0.05 }}
                      className={`relative p-4 rounded-xl mb-2 transition-all duration-200 hover:bg-white/5 group cursor-pointer ${
                        !notification.read ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-white/5'
                      }`}
                      onClick={() => !notification.read && onMarkAsRead(notification.id)}
                    >
                      <div className="flex items-start space-x-3">
                        {/* Icon */}
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${getNotificationColor(notification.type)} flex items-center justify-center flex-shrink-0`}>
                          {getNotificationIcon(notification.type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className={`text-sm font-medium ${!notification.read ? 'text-white' : 'text-white/80'}`}>
                                {notification.title}
                              </h4>
                              <p className={`text-sm mt-1 ${!notification.read ? 'text-white/80' : 'text-white/60'}`}>
                                {notification.message}
                              </p>
                              <p className="text-xs text-white/50 mt-2">
                                {formatTimeAgo(notification.timestamp)}
                              </p>
                            </div>

                            {/* Unread indicator */}
                            {!notification.read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1 ml-2" />
                            )}
                          </div>

                          {/* Action buttons */}
                          <div className="flex items-center space-x-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!notification.read && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onMarkAsRead(notification.id);
                                }}
                                className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center space-x-1"
                              >
                                <CheckIcon className="w-3 h-3" />
                                <span>Mark as read</span>
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(notification.id);
                              }}
                              className="text-xs text-red-400 hover:text-red-300 font-medium flex items-center space-x-1"
                            >
                              <TrashIcon className="w-3 h-3" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          {filteredNotifications.length > 0 && (
            <div className="p-4 border-t border-white/20">
              <button className="w-full text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors">
                View all notifications
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NotificationDropdown;