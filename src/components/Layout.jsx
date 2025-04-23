
import React from "react";
import Sidebar from "./Sidebar";
import Header from "../../components/Header";
import Footer from "./Footer";

export default function Layout({ children }) {
  return (
    <div className="flex min-h-screen bg-body">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <Header />
        <main className="p-6 flex-1 overflow-y-auto">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
