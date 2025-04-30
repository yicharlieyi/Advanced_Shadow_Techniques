#  CSC 562 Course Project - Advanced Shadow Techniques

## Project Description
This project implements real-time shadow mapping techniques in WebGL, including basic shadow maps, Cascaded Shadow Maps (CSM), Percentage Closer Filtering (PCF), and Variance Shadow Maps (VSM). The interactive UI allows users to toggle shadow modes, adjust cascade parameters, kernel size, bias scale, minimum variance, and control light position. The system demonstrates advanced shadow rendering for dynamic 3D scenes.

## Directions: How to Run the Code
1. Download or clone the repository.

2. Open index.html with Live Server (Live Server extension required).

3. Use the on-screen UI panel to select shadow techniques, adjust cascade count/size, kernel siz/bias size for PCF, and move the light source.

4. Navigation:
- Use arrow keys or WASD to navigate around the scene. 
- Use key `Q` to go up, key `E` to go down.
- Hold `Shift+Direction` key to rotate view.

## Extra Credits
1. Completed component 4 (15%): Implementation of Variance Shadow Maps: Implement VSM to store the mean and squared mean of depths, allowing for efficient Gaussian blurring. Focus on handling light bleeding issues and optimizing the storage and computation to maintain real-time performance.

2. Completed component 5 (5%): User Interface: develop a graphical interface that allows users to dynamically adjust shadow parameters (e.g., light position, bias value, cascade counts) in real-time. Additional Shadow Metrics and Statistics: Display real-time performance statistics, such as: Frame rate (FPS), Rendering times for each shadow technique.

## Assets
All textures used are stored in the textures folder.
