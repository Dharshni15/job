import React, { useContext, useEffect } from "react";
import "./App.css";
import { Context } from "./main";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Login from "./components/Auth/Login";
import Register from "./components/Auth/Register";
import { Toaster } from "react-hot-toast";
import axios from "axios";
import Navbar from "./components/Layout/Navbar";
import Footer from "./components/Layout/Footer";
import Home from "./components/Home/Home";
import Jobs from "./components/Job/Jobs";
import JobDetails from "./components/Job/JobDetails";
import Application from "./components/Application/Application";
import MyApplications from "./components/Application/MyApplications";
import PostJob from "./components/Job/PostJob";
import NotFound from "./components/NotFound/NotFound";
import MyJobs from "./components/Job/MyJobs";
import PostCertificate from "./components/Certificate/PostCertificate";
import Certificates from "./components/Certificate/Certificates";
import CertificateDetails from "./components/Certificate/CertificateDetails";
import MyCertificates from "./components/Certificate/MyCertificates";
import SendMessage from "./components/Message/SendMessage";
import Messages from "./components/Message/Messages";
import MessageDetails from "./components/Message/MessageDetails";
import ChatAppFixed from "./components/Chat/ChatAppFixed";

const App = () => {
  const { isAuthorized, setIsAuthorized, setUser } = useContext(Context);
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axios.get(
          "http://localhost:4001/api/v1/user/getuser",
          {
            withCredentials: true,
          }
        );
        setUser(response.data.user);
        setIsAuthorized(true);
      } catch (error) {
        setIsAuthorized(false);
      }
    };
    fetchUser();
  }, [isAuthorized]);

  return (
    <>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<Home />} />
          <Route path="/job/getall" element={<Jobs />} />
          <Route path="/job/:id" element={<JobDetails />} />
          <Route path="/application/:id" element={<Application />} />
          <Route path="/applications/me" element={<MyApplications />} />
          <Route path="/job/post" element={<PostJob />} />
          <Route path="/job/me" element={<MyJobs />} />
          <Route path="/certificate/post" element={<PostCertificate />} />
          <Route path="/certificates/getall" element={<Certificates />} />
          <Route path="/certificates/me" element={<MyCertificates />} />
          <Route path="/certificate/:id" element={<CertificateDetails />} />
          <Route path="/message/send/:userId" element={<SendMessage />} />
          <Route path="/messages/received" element={<Messages />} />
          <Route path="/messages/sent" element={<Messages />} />
          <Route path="/message/:id" element={<MessageDetails />} />
          <Route path="/chat" element={<ChatAppFixed />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Footer />
        <Toaster />
      </BrowserRouter>
    </>
  );
};

export default App;
