import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import Modal from './Modal';

function BuildingAssignments({ buildings, ras, assignedRAs, setAssignedRAs }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [editRAIndex, setEditRAIndex] = useState(null);
  const [showAssignedRAs, setShowAssignedRAs] = useState({});

  // Open modal for adding or editing an RA
  const handleOpenModal = (building, raIndex = null) => {
    setSelectedBuilding(building);
    setEditRAIndex(raIndex);
    setIsModalOpen(true);
  };

  // Assign or edit an RA for a building
  const handleAssignRA = (inputs) => {
    const { 'RA Name': raName } = inputs;
    if (!raName) return;

    // Extract RA information from the selected option
    const [name, scorePart, genderPart] = raName.split(' - ');
    const score = scorePart ? scorePart.split(': ')[1] : undefined;
    const gender = genderPart ? genderPart.split(': ')[1] : undefined;

    const ra = ras.find(ra => ra.name === name);

    const assignedRAList = assignedRAs[selectedBuilding.name] || [];
    if (editRAIndex !== null) {
      // Editing an existing RA
      assignedRAList[editRAIndex] = { ...ra, score, gender };
    } else {
      // Adding a new RA
      assignedRAList.push({ ...ra, score, gender });
    }

    setAssignedRAs((prevAssignedRAs) => ({
      ...prevAssignedRAs,
      [selectedBuilding.name]: assignedRAList,
    }));

    setIsModalOpen(false);
  };

  // Delete an RA from a building's list
  const handleDeleteRA = (buildingName, index) => {
    const updatedAssignedRAs = { ...assignedRAs };
    updatedAssignedRAs[buildingName] = assignedRAs[buildingName].filter((_, i) => i !== index);
    setAssignedRAs(updatedAssignedRAs);
  };

  // Toggle the view of assigned RAs for a building
  const toggleShowAssignedRAs = (buildingName) => {
    setShowAssignedRAs((prevShowAssignedRAs) => ({
      ...prevShowAssignedRAs,
      [buildingName]: !prevShowAssignedRAs[buildingName],
    }));
  };

// Generate a PDF of the building assignments
const generatePDF = async () => {
  try {
    const pdf = new jsPDF();

    // Calculate the total RA slots and total assigned RAs
    const totalRASlots = buildings.reduce((sum, building) => sum + building.numberOfRAs, 0);
    const totalAssignedRAs = Object.values(assignedRAs).flat().length;

    // Add the RA counter in the top right corner
    pdf.setFontSize(12);
    const raCounterText = `${totalAssignedRAs}/${totalRASlots} RAs Assigned`;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const textWidth = pdf.getStringUnitWidth(raCounterText) * pdf.internal.getFontSize() / pdf.internal.scaleFactor;
    pdf.text(raCounterText, pageWidth - textWidth - 10, 10);

    let yOffset = 20; // Start below the RA counter
    const lineHeight = 10;

    buildings.forEach((building, index) => {
      const assignedRAList = assignedRAs[building.name] || [];
      const assignedCount = assignedRAList.length;
      const totalRAs = building.numberOfRAs;

      pdf.text(`${index + 1}. ${building.name} - Area: ${building.area}`, 10, yOffset);
      yOffset += lineHeight;

      pdf.text(`${assignedCount}/${totalRAs} RAs Assigned`, 10, yOffset);
      yOffset += lineHeight;

      assignedRAList.forEach((ra) => {
        const raText = `${ra.name}${ra.score ? ` - Score: ${ra.score}` : ''}${ra.gender ? ` - Gender: ${ra.gender}` : ''}`;
        yOffset += lineHeight;
        pdf.text(`\u2022 ${raText}`, 20, yOffset);
      });

      yOffset += lineHeight / 2;
      pdf.line(10, yOffset, 200, yOffset);
      yOffset += lineHeight / 2;
    });

    pdf.text('Unassigned RAs', 10, yOffset);
    yOffset += lineHeight;

    const assignedRANames = new Set(
      Object.values(assignedRAs).flat().map(ra => ra.name)
    );

    const unassignedRAs = ras.filter(ra => !assignedRANames.has(ra.name));

    unassignedRAs.forEach((ra) => {
      const raText = `${ra.name}${ra.score ? ` - Score: ${ra.score}` : ''}${ra.gender ? ` - Gender: ${ra.gender}` : ''}`;
      pdf.text(`\u2022 ${raText}`, 20, yOffset);
      yOffset += lineHeight;
    });

    pdf.save('building-assignment.pdf');
  } catch (error) {
    console.error('Error generating PDF:', error);
  }
};
  // Calculate the total RA slots across all buildings
  const totalRASlots = buildings.reduce((sum, building) => sum + building.numberOfRAs, 0);

  // Calculate the total assigned RAs
  const totalAssignedRAs = Object.values(assignedRAs).flat().length;

  return (
    <div className="section">
      <div className="header">
        <button className="download-button" onClick={generatePDF}>Download PDF</button>
        <span className="ra-counter">{totalAssignedRAs}/{totalRASlots} RAs Assigned</span>
      </div>
      <div id="building-assignment-content">
        <h2>Building Assignment</h2>
        {buildings.map((building, index) => {
          const assignedRAList = assignedRAs[building.name] || [];
          const assignedCount = assignedRAList.length;

          return (
            <div key={index} className="building-wrapper">
              <div className="building">
                <h3>{index + 1}. {building.name} - Area: {building.area}</h3>
                <div className="ra-info">
                  <span className="ra-counter">{assignedCount}/{building.numberOfRAs} RAs Assigned</span>
                  <button className="view-ra-button" onClick={() => toggleShowAssignedRAs(building.name)}>
                    {showAssignedRAs[building.name] ? 'Hide RAs' : 'View RAs'}
                  </button>
                </div>
                {showAssignedRAs[building.name] && (
                  <ul className="assigned-ras">
                    {assignedRAList.map((ra, raIndex) => (
                      <li key={raIndex}>
                        {ra.name} {ra.score ? `- Score: ${ra.score}` : ''} {ra.gender ? `- Gender: ${ra.gender}` : ''}
                        <div className="ra-actions">
                          <button onClick={() => handleOpenModal(building, raIndex)}>Replace</button>
                          <button className="delete-button" onClick={() => handleDeleteRA(building.name, raIndex)}>Delete</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <button onClick={() => handleOpenModal(building)}>Add RA</button>
              </div>
            </div>
          );
        })}
        {isModalOpen && selectedBuilding && (
          <Modal
            onClose={() => setIsModalOpen(false)}
            onSave={handleAssignRA}
            fields={['RA Name']}
            dropdownOptions={ras
              .filter(ra => !Object.values(assignedRAs).some(assignments => assignments.some(assigned => assigned.name === ra.name)))
              .map(ra => `${ra.name}${ra.score !== undefined ? ' - Score: ' + ra.score : ''}${ra.gender !== undefined ? ' - Gender: ' + ra.gender : ''}`)}
            dropdownLabel="RA Name"
            initialData={editRAIndex !== null ? {
              'RA Name': `${assignedRAs[selectedBuilding.name][editRAIndex].name}${assignedRAs[selectedBuilding.name][editRAIndex].score ? ' - Score: ' + assignedRAs[selectedBuilding.name][editRAIndex].score : ''}${assignedRAs[selectedBuilding.name][editRAIndex].gender ? ' - Gender: ' + assignedRAs[selectedBuilding.name][editRAIndex].gender : ''}`
            } : {}}
          />
        )}
      </div>
    </div>
  );
}

export default BuildingAssignments;