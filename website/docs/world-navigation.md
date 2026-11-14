# 🧭 世界导航

欢迎来到幻想域。请点击下方分类展开查看：

<div id="world-tree-container" style="text-align: center; color: #888; padding: 50px;">
  正在读取世界地图...
</div>

<script>
  setTimeout(() => {
    const container = document.getElementById('world-tree-container');
    if (!container) return;

    fetch('/world-tree.json?t=' + Date.now())
      .then(res => res.json())
      .then(data => {
        if (!data || data.length === 0) {
          container.innerHTML = '<div style="color:#888; margin-top:50px;">暂无设定，请前往后台编辑。</div>';
          return;
        }

        container.innerHTML = '';
        container.style.padding = '0';
        container.style.textAlign = 'left';

        // 递归渲染多级树
        const renderTree = (nodes, level = 0) => {
          nodes.forEach(node => {
            const wrapper = document.createElement('div');
            // 层级越深，左边距越大，左边框越细
            wrapper.style.cssText = `margin-bottom: 10px; margin-left: ${level > 0 ? '20px' : '0'}; ${level > 0 ? 'border-left: 1px dashed #444; padding-left: 15px;' : ''}`;

            if (node.type === 'folder') {
              const header = document.createElement('div');
              header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; background: #252526; border-radius: 8px; border: 1px solid #333; cursor: pointer; transition: background 0.2s;';
              header.innerHTML = `
                <h2 style="margin: 0; font-size: ${level === 0 ? '20px' : '17px'}; color: #fff; border: none; padding: 0; display: flex; align-items: center;">
                  <span style="font-size: ${level === 0 ? '22px' : '18px'}; margin-right: 8px;">${node.icon || '📁'}</span>
                  ${node.name}
                  <span style="font-size: 12px; color: #0e639c; font-weight: normal; margin-left: 10px;">(${node.children ? node.children.length : 0})</span>
                </h2>
                <span class="arrow-icon" style="transform: rotate(0deg); transition: 0.3s; color: #888;">▼</span>
              `;
              
              const contentBox = document.createElement('div');
              contentBox.style.cssText = 'display: none; padding: 10px 0;';
              
              // 递归渲染子节点
              if (node.children) {
                contentBox.appendChild(renderTree(node.children, level + 1));
              }

              header.onclick = () => {
                const arrow = header.querySelector('.arrow-icon');
                if (contentBox.style.display === 'none') {
                  contentBox.style.display = 'block';
                  arrow.style.transform = 'rotate(180deg)';
                  arrow.style.color = '#0e639c';
                } else {
                  contentBox.style.display = 'none';
                  arrow.style.transform = 'rotate(0deg)';
                  arrow.style.color = '#888';
                }
              };

              wrapper.appendChild(header);
              wrapper.appendChild(contentBox);
            } else {
              // 如果是文件
              const link = document.createElement('a');
              link.href = node.slug;
              link.style.cssText = 'display: block; padding: 12px 20px; background: #1e1e1e; border: 1px solid #333; border-radius: 8px; text-decoration: none !important; transition: all 0.2s;';
              link.innerHTML = `
                <h3 style="margin: 0 0 5px 0; color: #fff; font-size: 16px; border: none; padding: 0;">📄 ${node.name}</h3>
                <p style="margin: 0; color: #aaa; font-size: 13px; line-height: 1.5;">${node.desc || '点击查看详情'}</p>
              `;
              link.onmouseover = () => link.style.borderColor = '#0e639c';
              link.onmouseout = () => link.style.borderColor = '#333';
              wrapper.appendChild(link);
            }
            
            // 由于 renderTree 返回的是一个包裹了所有子节点的容器
            // 为了适配外层，我们用一个临时 fragment 收集
            if (!wrapper.parentNode) {
                wrapper.dataset.topLevel = level === 0 ? 'true' : 'false';
            }
          });
          
          // 返回一个 fragment 包含所有节点
          const fragment = document.createDocumentFragment();
          nodes.forEach(node => {
            const wrapper = document.createElement('div');
            wrapper.style.cssText = `margin-bottom: 10px; margin-left: ${level > 0 ? '20px' : '0'}; ${level > 0 ? 'border-left: 1px dashed #444; padding-left: 15px;' : ''}`;
            
            if (node.type === 'folder') {
              const header = document.createElement('div');
              header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; background: #252526; border-radius: 8px; border: 1px solid #333; cursor: pointer; transition: background 0.2s;';
              header.innerHTML = `
                <h2 style="margin: 0; font-size: ${level === 0 ? '20px' : '17px'}; color: #fff; border: none; padding: 0; display: flex; align-items: center;">
                  <span style="font-size: ${level === 0 ? '22px' : '18px'}; margin-right: 8px;">${node.icon || '📁'}</span>
                  ${node.name}
                  <span style="font-size: 12px; color: #0e639c; font-weight: normal; margin-left: 10px;">(${node.children ? node.children.length : 0})</span>
                </h2>
                <span class="arrow-icon" style="transform: rotate(0deg); transition: 0.3s; color: #888;">▼</span>
              `;
              
              const contentBox = document.createElement('div');
              contentBox.style.cssText = 'display: none; padding: 10px 0;';
              if (node.children) contentBox.appendChild(renderTree(node.children, level + 1));

              header.onclick = () => {
                const arrow = header.querySelector('.arrow-icon');
                if (contentBox.style.display === 'none') {
                  contentBox.style.display = 'block';
                  arrow.style.transform = 'rotate(180deg)';
                  arrow.style.color = '#0e639c';
                } else {
                  contentBox.style.display = 'none';
                  arrow.style.transform = 'rotate(0deg)';
                  arrow.style.color = '#888';
                }
              };

              wrapper.appendChild(header);
              wrapper.appendChild(contentBox);
            } else {
              const link = document.createElement('a');
              link.href = node.slug;
              link.style.cssText = 'display: block; padding: 12px 20px; background: #1e1e1e; border: 1px solid #333; border-radius: 8px; text-decoration: none !important; transition: all 0.2s; margin-top: 5px;';
              link.innerHTML = `
                <h3 style="margin: 0 0 5px 0; color: #fff; font-size: 16px; border: none; padding: 0;">📄 ${node.name}</h3>
                <p style="margin: 0; color: #aaa; font-size: 13px; line-height: 1.5;">${node.desc || '点击查看详情'}</p>
              `;
              link.onmouseover = () => link.style.borderColor = '#0e639c';
              link.onmouseout = () => link.style.borderColor = '#333';
              wrapper.appendChild(link);
            }
            fragment.appendChild(wrapper);
          });
          
          return fragment;
        };

        container.appendChild(renderTree(data, 0));

      })
      .catch(err => {
        console.error(err);
        container.innerHTML = '<div style="color: #fff; padding: 20px; background: #a82626; border-radius: 8px;">⚠️ 读取数据失败，请确保后台已保存世界观树。</div>';
      });
  }, 500);
</script>